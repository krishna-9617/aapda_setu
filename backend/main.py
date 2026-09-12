from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import uuid

from data_loader import load_data
from optimizer import build_and_solve
from event_simulator import trigger_bridge_collapse, trigger_capacity_drop, compare_plans, trigger_rainfall_event
from plan_health import calculate_plan_health

app = FastAPI(title="Aapda Setu Prototype API")

# Configure CORS for local development and Vercel production deployment
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins_env else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root_health_check():
    return {"status": "ok", "service": "Aapda Setu API"}

import copy
import datetime

# Global state
current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, 'data')

from sensitivity import compute_classification_stability

habitations, sites, routes = load_data(data_dir)
stability_map = compute_classification_stability(habitations)
for hid, stab in stability_map.items():
    habitations[hid]['classification_stability'] = stab
current_plan = None
pending_plan = None
pending_data = None
plan_history = []
audit_log = []
mock_alerts = []
mock_alerts = []

class BridgeCollapseRequest(BaseModel):
    route_id: str

class CapacityDropRequest(BaseModel):
    site_id: str
    drop_percent: float = 0.5

class InterventionRequest(BaseModel):
    type: str
    site_id: str = None
    resource_type: str = None
    amount: int = None
    habitation_id: str = None

class RainfallRequest(BaseModel):
    intensity: float

class FieldReportRequest(BaseModel):
    incident_type: str
    target_id: str
    drop_percent: float = 0.5
    reported_by: str = "Field Officer"

def record_audit_log(action_type, description, objective=None):
    global audit_log
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "action_type": action_type,
        "description": description,
        "objective": objective
    }
    audit_log.append(entry)

def record_plan_in_history(plan, trigger_event=None):
    global plan_history
    if len(plan_history) > 0:
        plan_history[-1]["superseded_by"] = plan["plan_id"]
        
    entry = {
        "plan_id": plan["plan_id"],
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "trigger_event": trigger_event,
        "objective": plan.get("objective"),
        "solver_status": plan.get("solver_status"),
        "superseded_by": None
    }
    plan_history.append(entry)

def generate_mock_alerts(plan, habs, sts, rts):
    alerts = []
    if not plan or not plan.get("assignments"):
        return alerts
    for a in plan["assignments"]:
        h_name = habs.get(a["habitation_id"], {}).get("name", a["habitation_id"])
        s_name = sts.get(a["site_id"], {}).get("name", a["site_id"])
        msg = f"Relocation advisory: proceed to {s_name} via {a['route_id']}. [Livestock/asset safety guidance placeholder]. - Aapda Setu / District Authority"
        alerts.append({
            "to": h_name,
            "message": msg,
            "timestamp": datetime.datetime.now().isoformat()
        })
    return alerts

@app.get('/alerts/sent')
def get_alerts_sent():
    return {
        "status": "SIMULATED - not sent to real numbers",
        "alerts": mock_alerts
    }

def _generate_baseline():
    """Generate a fresh baseline plan from clean CSV data."""
    global current_plan, pending_plan, pending_data, habitations, sites, routes, plan_history, audit_log
    habitations, sites, routes = load_data(data_dir)
    stability_map = compute_classification_stability(habitations)
    for hid, stab in stability_map.items():
        habitations[hid]['classification_stability'] = stab
    result = build_and_solve(habitations, sites, routes)
    current_plan = {
        "plan_id": str(uuid.uuid4()),
        "status": "approved",
        "solver_status": result["status"],
        "solver_time_sec": result["time_sec"],
        "solver_gap_percent": result.get("gap", 0.0),
        "objective": result.get("objective"),
        "assignments": result["assignments"],
        "unmet_demand": result.get("unmet_demand", {}),
        "filtering_reasons": result.get("filtering_reasons", {})
    }
    pending_plan = None
    pending_data = None
    plan_history = []
    audit_log = []
    mock_alerts.clear()
    record_plan_in_history(current_plan, "Initial Baseline")
    record_audit_log("baseline_generated", "Initial Baseline Generated", current_plan.get("objective"))
    return current_plan

@app.on_event("startup")
def startup_generate_baseline():
    """Auto-generate a fresh baseline plan when the server starts."""
    _generate_baseline()
    print(f"Baseline plan generated on startup: status={current_plan['solver_status']}, "
          f"objective={current_plan.get('objective')}, "
          f"assignments={len(current_plan['assignments'])}")

@app.get("/habitations")
def get_habitations():
    return habitations

@app.get("/sites")
def get_sites():
    return sites

@app.get("/routes")
def get_routes():
    return routes

@app.get("/plans/current")
def get_current_plan():
    if current_plan is None:
        raise HTTPException(status_code=404, detail="No active plan. Call /plans/optimize first.")
    return current_plan

@app.get("/plans/comparison")
def get_plan_comparison():
    global habitations, sites, routes, current_plan
    from optimizer import naive_nearest_site
    
    # 1. Naive baseline
    naive_res = naive_nearest_site(habitations, sites, routes)
    
    # 2. CP-SAT metrics from current_plan (which is already solved)
    if current_plan:
        cp_unmet = sum(current_plan.get("unmet_demand", {}).values())
        
        site_assigned = {s: 0 for s in sites}
        times = []
        risks = []
        for a in current_plan["assignments"]:
            site_assigned[a["site_id"]] += a["people_count"]
            r = routes.get(a["route_id"])
            if r:
                times.append(r["travel_time_min"])
                risks.append(r["risk_score"])
                
        cp_over_cap = sum(1 for s, count in site_assigned.items() if count > sites[s]["effective_capacity"])
        cp_avg_time = sum(times) / len(times) if times else 0
        cp_avg_risk = sum(risks) / len(risks) if risks else 0
    else:
        cp_unmet, cp_over_cap, cp_avg_time, cp_avg_risk = 0, 0, 0, 0

    return {
        "naive": {
            "unmet_demand": naive_res["unmet_demand"],
            "avg_travel_time": naive_res["avg_travel_time"],
            "avg_risk": naive_res["avg_risk"],
            "over_capacity_count": naive_res["over_capacity_count"]
        },
        "cpsat": {
            "unmet_demand": cp_unmet,
            "avg_travel_time": cp_avg_time,
            "avg_risk": cp_avg_risk,
            "over_capacity_count": cp_over_cap
        }
    }

@app.get("/plans/health")
def get_plan_health():
    if current_plan is None:
        return {"status": "UNKNOWN", "unmet_demand_total": 0, "interventions": []}
    return calculate_plan_health(current_plan, habitations, sites, routes)

@app.post("/plans/apply-intervention")
def apply_intervention(req: InterventionRequest):
    global current_plan, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan.")

    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)
    
    invalidation_reason = ""
    trigger_event = ""

    if req.type == "increase_capacity":
        site_id = req.site_id
        res_type = req.resource_type
        amount = req.amount
        
        temp_sites[site_id][res_type] += amount
        
        # Also proportionally increase hard constraints if applicable
        if "food" in res_type:
            temp_sites[site_id]["food_supply_units"] += (amount * 3)
        if "health" in res_type or "medical" in res_type:
            temp_sites[site_id]["medical_supply_units"] += (amount // 20) + 1

        from event_simulator import recompute_effective_capacity
        temp_sites[site_id]["effective_capacity"] = recompute_effective_capacity(temp_sites[site_id])
        
        site_name = temp_sites[site_id]["name"]
        trigger_event = f"Intervention: Increased {res_type} at {site_id}"
        invalidation_reason = f"Intervention applied: increased {res_type.replace('capacity_', '')} capacity at {site_name} by {amount} units."
        
    elif req.type == "open_route":
        # Create a new route
        hid = req.habitation_id
        sid = req.site_id
        rid = f"R_EMERG_{hid}_{sid}"
        
        # Calculate approximate distance (Euclidean * 100 for dummy km)
        lat1, lon1 = temp_habitations[hid]["lat"], temp_habitations[hid]["lon"]
        lat2, lon2 = temp_sites[sid]["lat"], temp_sites[sid]["lon"]
        dist = ((lat1-lat2)**2 + (lon1-lon2)**2)**0.5 * 111.0 # rough km
        
        temp_routes[rid] = {
            "route_id": rid,
            "from_habitation_id": hid,
            "to_site_id": sid,
            "distance_km": round(dist, 1),
            "travel_time_min": round(dist * 5, 1), # Assume ~12 km/h avg
            "risk_score": 0.2,
            "status": "open",
            "capacity_per_hour": 500
        }
        
        hab_name = temp_habitations[hid]["name"]
        site_name = temp_sites[sid]["name"]
        trigger_event = f"Intervention: Opened route {hid} to {sid}"
        invalidation_reason = f"Intervention applied: opened emergency route from {hab_name} to {site_name}."
        
    else:
        raise HTTPException(status_code=400, detail="Unknown intervention type")

    old_obj = current_plan.get("objective")
    new_result = build_and_solve(temp_habitations, temp_sites, temp_routes)
    changes = compare_plans(current_plan["assignments"], new_result["assignments"])

    pending_plan = {
        "plan_id": str(uuid.uuid4()),
        "status": "pending_approval",
        "trigger_event": trigger_event,
        "solver_status": new_result["status"],
        "solver_time_sec": new_result["time_sec"],
        "solver_gap_percent": new_result.get("gap", 0.0),
        "objective": new_result.get("objective"),
        "assignments": new_result["assignments"],
        "unmet_demand": new_result.get("unmet_demand", {}),
        "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
        "invalidation_reason": invalidation_reason
    }
    pending_data = {
        "habitations": temp_habitations,
        "sites": temp_sites,
        "routes": temp_routes
    }
    
    record_audit_log("event_triggered", pending_plan["trigger_event"] + " ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Triggered", pending_plan.get("objective"))

    return {
        "event_id": f"INT-{str(uuid.uuid4())[:8]}",
        "new_plan_id": pending_plan["plan_id"],
        "solver_status": pending_plan["solver_status"],
        "solver_time_sec": pending_plan["solver_time_sec"],
        "solver_gap_percent": pending_plan["solver_gap_percent"],
        "changed_assignments": len(changes),
        "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
        "affected_habitations": list(set([c["habitation_id"] for c in changes])),
        "old_objective": old_obj,
        "new_objective": pending_plan.get("objective"),
        "plan": pending_plan,
        "pending_data": pending_data
    }

@app.get("/plans/pending")
def get_pending_plan():
    return pending_plan

@app.get("/plans/history")
def get_plan_history():
    return list(reversed(plan_history))

@app.get("/audit-log")
def get_audit_log():
    return list(reversed(audit_log))

@app.post("/plans/{plan_id}/approve")
def approve_plan(plan_id: str):
    global current_plan, pending_plan, pending_data, habitations, sites, routes, plan_history
    if pending_plan is None or pending_plan["plan_id"] != plan_id:
        raise HTTPException(status_code=404, detail="Pending plan not found.")
    
    pending_plan["status"] = "approved"
    trigger_event = pending_plan.get("trigger_event")
    current_plan = pending_plan
    
    if pending_data:
        habitations = pending_data["habitations"]
        sites = pending_data["sites"]
        routes = pending_data["routes"]
        
    record_plan_in_history(current_plan, trigger_event)
    record_audit_log("plan_approved", f"{trigger_event} - Approved", current_plan.get("objective"))
    
    global mock_alerts
    new_alerts = generate_mock_alerts(current_plan, habitations, sites, routes)
    mock_alerts.extend(new_alerts)
    if len(mock_alerts) > 50:
        mock_alerts = mock_alerts[-50:]
    
    pending_plan = None
    pending_data = None
    return current_plan

@app.post("/plans/{plan_id}/reject")
def reject_plan(plan_id: str):
    global pending_plan, pending_data
    if pending_plan is None or pending_plan["plan_id"] != plan_id:
        raise HTTPException(status_code=404, detail="Pending plan not found.")
    
    record_audit_log("plan_rejected", f"{pending_plan.get('trigger_event')} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Rejected", pending_plan.get("objective"))
    pending_plan = None
    pending_data = None
    return {"status": "rejected", "message": "Plan rejected."}

@app.post("/plans/optimize")
def optimize_plan():
    try:
        return _generate_baseline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer failed: {str(e)}")

@app.post("/plans/reset")
def reset_plan():
    """Reset all state to a clean baseline (reload CSVs, re-optimize from scratch)."""
    try:
        return _generate_baseline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@app.post("/events/rainfall")
def rainfall_event(req: RainfallRequest):
    global current_plan, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify.")

    if not (0.0 <= req.intensity <= 1.0):
        raise HTTPException(status_code=400, detail="Intensity must be between 0.0 and 1.0")

    old_assignments = current_plan["assignments"]
    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)

    try:
        old_obj = current_plan.get("objective")
        new_result = trigger_rainfall_event(req.intensity, temp_habitations, temp_sites, temp_routes, current_plan)
        changes = compare_plans(old_assignments, new_result["assignments"])

        intensity_label = "Light" if req.intensity <= 0.3 else ("Severe" if req.intensity >= 0.9 else "Moderate")

        pending_plan = {
            "plan_id": str(uuid.uuid4()),
            "status": "pending_approval",
            "trigger_event": f"Rainfall Event ({intensity_label})",
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "invalidation_reason": new_result.get("invalidation_reason")
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Triggered", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "solver_gap_percent": pending_plan["solver_gap_percent"],
            "changed_assignments": len(changes),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
            "invalidation_reason": pending_plan.get("invalidation_reason"),
            "plan": pending_plan,
            "pending_data": pending_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event simulation failed: {str(e)}")

@app.post("/events/bridge-collapse")
def bridge_collapse(req: BridgeCollapseRequest):
    global current_plan, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify. Call /plans/optimize first.")

    if req.route_id not in routes:
        raise HTTPException(status_code=400, detail=f"Invalid route_id '{req.route_id}'. Valid IDs: {list(routes.keys())}")

    old_assignments = current_plan["assignments"]
    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)

    try:
        old_obj = current_plan.get("objective")
        new_result = trigger_bridge_collapse(req.route_id, temp_habitations, temp_sites, temp_routes, current_plan)
        changes = compare_plans(old_assignments, new_result["assignments"])

        pending_plan = {
            "plan_id": str(uuid.uuid4()),
            "status": "pending_approval",
            "trigger_event": f"Bridge Collapse on {req.route_id}",
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "invalidation_reason": new_result.get("invalidation_reason")
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Triggered", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "solver_gap_percent": pending_plan["solver_gap_percent"],
            "changed_assignments": len(changes),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
            "invalidation_reason": pending_plan.get("invalidation_reason"),
            "plan": pending_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event simulation failed: {str(e)}")

@app.post("/events/capacity-drop")
def capacity_drop(req: CapacityDropRequest):
    global current_plan, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify.")

    if req.site_id not in sites:
        raise HTTPException(status_code=400, detail=f"Invalid site_id '{req.site_id}'. Valid IDs: {list(sites.keys())}")

    old_assignments = current_plan["assignments"]
    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)

    try:
        old_obj = current_plan.get("objective")
        new_result = trigger_capacity_drop(req.site_id, req.drop_percent, temp_habitations, temp_sites, temp_routes, current_plan)
        changes = compare_plans(old_assignments, new_result["assignments"])

        pending_plan = {
            "plan_id": str(uuid.uuid4()),
            "status": "pending_approval",
            "trigger_event": f"Capacity Drop on {req.site_id}",
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "invalidation_reason": new_result.get("invalidation_reason")
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Triggered", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "solver_gap_percent": pending_plan["solver_gap_percent"],
            "changed_assignments": len(changes),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
            "invalidation_reason": pending_plan.get("invalidation_reason"),
            "plan": pending_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event simulation failed: {str(e)}")

@app.post("/field-reports/hazard-incident")
def hazard_incident(req: FieldReportRequest):
    global current_plan, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify.")
        
    old_assignments = current_plan["assignments"]
    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)

    try:
        old_obj = current_plan.get("objective")
        
        if req.incident_type == "bridge_collapse":
            if req.target_id not in routes:
                raise HTTPException(status_code=400, detail="Invalid route_id")
            new_result = trigger_bridge_collapse(req.target_id, temp_habitations, temp_sites, temp_routes, current_plan)
            trigger_text = f"Field Report ({req.reported_by}): Bridge Collapse on {req.target_id}"
        elif req.incident_type == "capacity_drop":
            if req.target_id not in sites:
                raise HTTPException(status_code=400, detail="Invalid site_id")
            new_result = trigger_capacity_drop(req.target_id, req.drop_percent, temp_habitations, temp_sites, temp_routes, current_plan)
            trigger_text = f"Field Report ({req.reported_by}): Capacity Drop on {req.target_id}"
        else:
            raise HTTPException(status_code=400, detail="Unknown incident type")
            
        changes = compare_plans(old_assignments, new_result["assignments"])

        pending_plan = {
            "plan_id": str(uuid.uuid4()),
            "status": "pending_approval",
            "trigger_event": trigger_text,
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "invalidation_reason": new_result.get("invalidation_reason")
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Reported", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "solver_gap_percent": pending_plan["solver_gap_percent"],
            "changed_assignments": len(changes),
            "changes": changes,
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
            "invalidation_reason": pending_plan.get("invalidation_reason"),
            "plan": pending_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Incident report failed: {str(e)}")
class WhatIfRequest(BaseModel):
    population_multiplier: float = 1.0
    target_habitation_id: Optional[str] = None
    hazard_score: Optional[float] = None

@app.post("/plans/simulate")
def simulate_plan(req: WhatIfRequest):
    global current_plan, habitations, sites, routes, pending_plan, pending_data
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan. Call /plans/optimize first.")

    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)
    
    if req.target_habitation_id and req.target_habitation_id in temp_habitations:
        hid = req.target_habitation_id
        temp_habitations[hid]["population"] = int(temp_habitations[hid]["population"] * req.population_multiplier)
        if req.hazard_score is not None:
            temp_habitations[hid]["hazard_score"] = req.hazard_score
            temp_habitations[hid]["flood_score"] = req.hazard_score # Simplify overrides
    else:
        for hid, hab in temp_habitations.items():
            hab["population"] = int(hab["population"] * req.population_multiplier)
        
    try:
        new_result = build_and_solve(temp_habitations, temp_sites, temp_routes)
        
        # Calculate Plan Health on simulated data
        from plan_health import calculate_plan_health
        health_data = calculate_plan_health(new_result, temp_habitations, temp_sites, temp_routes)
        
        total_unmet = sum(new_result.get("unmet_demand", {}).values())
        current_total_unmet = sum(current_plan.get("unmet_demand", {}).values())
        
        # Generate temporary pending plan for "Implement" button
        simulated_pending_plan = {
            "plan_id": str(uuid.uuid4()),
            "status": "pending_approval",
            "trigger_event": "What-If scenario implemented",
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": compare_plans(current_plan["assignments"], new_result["assignments"]),
            "filtering_reasons": new_result.get("filtering_reasons", {}),
            "invalidation_reason": "What-If Scenario applied"
        }
        
        return {
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "solver_gap_percent": new_result.get("gap", 0.0),
            "objective": new_result.get("objective"),
            "total_unmet_demand": total_unmet,
            "current_total_unmet_demand": current_total_unmet,
            "population_multiplier": req.population_multiplier,
            "target_habitation_id": req.target_habitation_id,
            "hazard_score": req.hazard_score,
            "health": health_data,
            "simulated_pending_plan": simulated_pending_plan,
            "simulated_data": {
                "habitations": temp_habitations,
                "sites": temp_sites,
                "routes": temp_routes
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

class ImplementWhatIfRequest(BaseModel):
    simulated_pending_plan: dict
    simulated_data: dict

@app.post("/plans/implement-what-if")
def implement_what_if(req: ImplementWhatIfRequest):
    global pending_plan, pending_data
    pending_plan = req.simulated_pending_plan
    pending_data = req.simulated_data
    return {"status": "ok", "pending_plan": pending_plan}
