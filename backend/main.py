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

# Global state
current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, 'data')

habitations, sites, routes = load_data(data_dir)
current_plan = None

class BridgeCollapseRequest(BaseModel):
    route_id: str

class CapacityDropRequest(BaseModel):
    site_id: str
    drop_percent: float

def _generate_baseline():
    """Generate a fresh baseline plan from clean CSV data."""
    global current_plan, habitations, sites, routes
    habitations, sites, routes = load_data(data_dir)
    result = build_and_solve(habitations, sites, routes)
    current_plan = {
        "plan_id": str(uuid.uuid4()),
        "solver_status": result["status"],
        "solver_time_sec": result["time_sec"],
        "objective": result.get("objective"),
        "assignments": result["assignments"],
        "unmet_demand": result.get("unmet_demand", {})
    }
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
    global current_plan
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify. Call /plans/optimize first.")

    if req.route_id not in routes:
        raise HTTPException(status_code=400, detail=f"Invalid route_id '{req.route_id}'. Valid IDs: {list(routes.keys())}")

    old_assignments = current_plan["assignments"]

    try:
        old_obj = current_plan.get("objective")
        new_result = trigger_bridge_collapse(req.route_id, habitations, sites, routes, current_plan)
        changes = compare_plans(old_assignments, new_result["assignments"])

        current_plan = {
            "plan_id": str(uuid.uuid4()),
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {})
        }

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": current_plan["plan_id"],
            "solver_status": current_plan["solver_status"],
            "solver_time_sec": current_plan["solver_time_sec"],
            "changed_assignments": len(changes),
            "changes": changes,
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": current_plan.get("objective")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event simulation failed: {str(e)}")

@app.post("/events/capacity-drop")
def capacity_drop(req: CapacityDropRequest):
    global current_plan
    if current_plan is None:
        raise HTTPException(status_code=400, detail="No active plan to modify.")

    if req.site_id not in sites:
        raise HTTPException(status_code=400, detail=f"Invalid site_id '{req.site_id}'. Valid IDs: {list(sites.keys())}")

    old_assignments = current_plan["assignments"]

    try:
        old_obj = current_plan.get("objective")
        new_result = trigger_capacity_drop(req.site_id, req.drop_percent, habitations, sites, routes, current_plan)
        changes = compare_plans(old_assignments, new_result["assignments"])

        current_plan = {
            "plan_id": str(uuid.uuid4()),
            "solver_status": new_result["status"],
            "solver_time_sec": new_result["time_sec"],
            "objective": new_result.get("objective"),
            "assignments": new_result["assignments"],
            "unmet_demand": new_result.get("unmet_demand", {})
        }

        return {
            "event_id": f"EVT-{str(uuid.uuid4())[:8]}",
            "new_plan_id": current_plan["plan_id"],
            "solver_status": current_plan["solver_status"],
            "solver_time_sec": current_plan["solver_time_sec"],
            "changed_assignments": len(changes),
            "changes": changes,
            "affected_habitations": list(set([c["habitation_id"] for c in changes])),
            "old_objective": old_obj,
            "new_objective": current_plan.get("objective")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event simulation failed: {str(e)}")