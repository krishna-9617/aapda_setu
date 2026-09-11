import os
from data_loader import load_data
from optimizer import build_and_solve
from event_simulator import trigger_bridge_collapse

def run_tests():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    
    print("--- BASELINE (No collapses) ---")
    habitations, sites, routes = load_data(data_dir)
    baseline_result = build_and_solve(habitations, sites, routes)
    for a in baseline_result["assignments"]:
        if a["habitation_id"] == "BRP-001":
            print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")

    print("\n--- SCENARIO 1: Collapse Primary Route (R01) ---")
    habs1, sites1, routes1 = load_data(data_dir)
    base1 = build_and_solve(habs1, sites1, routes1)
    res1 = trigger_bridge_collapse("R01", habs1, sites1, routes1, base1)
    for a in res1["assignments"]:
        if a["habitation_id"] == "BRP-001":
            print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")

    print("\n--- SCENARIO 2: Collapse Primary (R01) AND Alternate (R01B) ---")
    habs2, sites2, routes2 = load_data(data_dir)
    base2 = build_and_solve(habs2, sites2, routes2)
    # Close R01 first
    routes2["R01"]["status"] = "closed"
    # Now trigger event on R01B
    res2 = trigger_bridge_collapse("R01B", habs2, sites2, routes2, base2)
    for a in res2["assignments"]:
        if a["habitation_id"] == "BRP-001":
            print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")

if __name__ == "__main__":
    run_tests()
