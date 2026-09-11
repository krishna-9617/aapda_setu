import os
from data_loader import load_data
from optimizer import build_and_solve
from event_simulator import trigger_bridge_collapse

def run_checks(new_plan, habitations, sites, baseline_plan):
    print("\n=== Verification Checks ===")
    
    # Capacity verification
    print("\n--- Capacity Check ---")
    site_assigned = {s: 0 for s in sites}
    for a in new_plan["assignments"]:
        site_assigned[a['site_id']] += a['people_count']
        
    for s_id, count in site_assigned.items():
        eff_cap = sites[s_id]['effective_capacity']
        status = "OK" if count <= eff_cap else "EXCEEDED!"
        print(f"Site {s_id}: Assigned = {count}, Capacity = {eff_cap} [{status}]")

    # Population conservation check
    print("\n--- Population Conservation Check ---")
    total_population = sum(h['population'] for h in habitations.values())
    
    baseline_assigned = sum(a['people_count'] for a in baseline_plan["assignments"])
    baseline_unmet = sum(baseline_plan["unmet_demand"].values())
    baseline_total = baseline_assigned + baseline_unmet
    
    new_assigned = sum(a['people_count'] for a in new_plan["assignments"])
    new_unmet = sum(new_plan.get("unmet_demand", {}).values())
    new_total = new_assigned + new_unmet
    
    print(f"Total Population in Habitations: {total_population}")
    print(f"Baseline Plan -> Assigned: {baseline_assigned}, Unmet Demand: {baseline_unmet} (Total: {baseline_total})")
    print(f"New Plan      -> Assigned: {new_assigned}, Unmet Demand: {new_unmet} (Total: {new_total})")
    
    if total_population == baseline_total == new_total:
        print("Status: MATCH - No people disappeared or double-counted.")
    else:
        print("Status: MISMATCH!")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    
    # Load fresh data
    habitations, sites, routes = load_data(data_dir)
    
    print("=== 1. Initial Baseline Optimization ===")
    baseline_result = build_and_solve(habitations, sites, routes)
    
    # Trigger Bridge Collapse on Route R01
    new_result = trigger_bridge_collapse("R01", habitations, sites, routes, baseline_result)
    
    print("=== 2. Re-Optimized Plan ===")
    print(f"Status: {new_result['status']}")
    if new_result["status"] not in ["HEURISTIC FALLBACK"]:
        print(f"Objective Value: {new_result['objective']}")
        
    print("\n--- FULL New Assignments ---")
    for a in new_result["assignments"]:
        print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")

    run_checks(new_result, habitations, sites, baseline_result)
