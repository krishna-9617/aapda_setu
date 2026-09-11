import os
from data_loader import load_data
from optimizer import build_and_solve
from event_simulator import trigger_bridge_collapse, trigger_capacity_drop
from test_event import run_checks

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    
    # Load fresh data
    habitations, sites, routes = load_data(data_dir)
    
    print("=== 0. Initial Baseline Optimization ===")
    baseline_result = build_and_solve(habitations, sites, routes)
    
    # Trigger Bridge Collapse on Route R01 to get into the state where SHL-005 has 2800 people
    print("\n--- Simulating previous event (Bridge Collapse R01) to reach target state ---")
    state_after_collapse = trigger_bridge_collapse("R01", habitations, sites, routes, baseline_result)
    
    print("\n\n" + "="*50)
    print("=== 1. Starting Target State Reached ===")
    print("Triggering 50% water capacity drop on SHL-005...")
    
    # Trigger Capacity Drop on SHL-005 by 50%
    new_result = trigger_capacity_drop("SHL-005", 0.5, habitations, sites, routes, state_after_collapse)
    
    print("=== 2. Re-Optimized Plan ===")
    print(f"Status: {new_result['status']}")
    if new_result["status"] not in ["HEURISTIC FALLBACK"]:
        print(f"Objective Value: {new_result['objective']}")
        
    print("\n--- FULL New Assignments ---")
    for a in new_result["assignments"]:
        print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")

    run_checks(new_result, habitations, sites, state_after_collapse)
