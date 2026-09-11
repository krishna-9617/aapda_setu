from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid

from data_loader import load_data
from optimizer import build_and_solve
from event_simulator import trigger_bridge_collapse, trigger_capacity_drop, compare_plans

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

habitations, sites, routes = load_data(data_dir)
current_plan = None
pending_plan = None
pending_data = None
plan_history = []
audit_log = []

class BridgeCollapseRequest(BaseModel):
    route_id: str

class CapacityDropRequest(BaseModel):
    site_id: str
    drop_percent: float

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

def _generate_baseline():
    """Generate a fresh baseline plan from clean CSV data."""
    global current_plan, pending_plan, pending_data, habitations, sites, routes, plan_history, audit_log
    habitations, sites, routes = load_data(data_dir)
    result = build_and_solve(habitations, sites, routes)
    current_plan = {
        "plan_id": str(uuid.uuid4()),
        "status": "approved",
        "solver_status": result["status"],
        "solver_time_sec": result["time_sec"],
        "objective": result.get("objective"),
        "assignments": result["assignments"],
        "unmet_demand": result.get("unmet_demand", {})
    }
    pending_plan = None
    pending_data = None
    plan_history = []
    audit_log = []
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
    record_audit_log("plan_approved", f"{trigger_event} — Approved", current_plan.get("objective"))
    
    pending_plan = None
    pending_data = None
    return current_plan

@app.post("/plans/{plan_id}/reject")
def reject_plan(plan_id: str):
    global pending_plan, pending_data
    if pending_plan is None or pending_plan["plan_id"] != plan_id:
        raise HTTPException(status_code=404, detail="Pending plan not found.")
    
    record_audit_log("plan_rejected", f"{pending_plan.get('trigger_event')} — Rejected", pending_plan.get("objective"))
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
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " — Triggered", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "changed_assignments": len(changes),
            "changes": changes,
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
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
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " — Triggered", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "changed_assignments": len(changes),
            "changes": changes,
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
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
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {}),
            "changes": changes
        }
        pending_data = {
            "habitations": temp_habitations,
            "sites": temp_sites,
            "routes": temp_routes
        }
        
        record_audit_log("event_triggered", pending_plan["trigger_event"] + " — Reported", pending_plan.get("objective"))

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": pending_plan["plan_id"],
            "solver_status": pending_plan["solver_status"],
            "solver_time_sec": pending_plan["solver_time_sec"],
            "changed_assignments": len(changes),
            "changes": changes,
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": pending_plan.get("objective"),
            "plan": pending_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Incident report failed: {str(e)}")
class WhatIfRequest(BaseModel):
    population_multiplier: float = 1.0

@app.post("/plans/simulate")
def simulate_plan(req: WhatIfRequest):
    global current_plan, habitations, sites, routes
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan. Call /plans/optimize first.")

    temp_habitations = copy.deepcopy(habitations)
    temp_sites = copy.deepcopy(sites)
    temp_routes = copy.deepcopy(routes)
    
    for hid, hab in temp_habitations.items():
        hab["population"] = int(hab["population"] * req.population_multiplier)
        
    try:
        new_result = build_and_solve(temp_habitations, temp_sites, temp_routes)
        
        total_unmet = sum(new_result.get("unmet_demand", {}).values())
        current_total_unmet = sum(current_plan.get("unmet_demand", {}).values())
        
        return {
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "objective": new_result.get("objective"),
            "total_unmet_demand": total_unmet,
            "current_total_unmet_demand": current_total_unmet,
            "population_multiplier": req.population_multiplier
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
