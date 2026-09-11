import copy
from optimizer import build_and_solve

def recompute_effective_capacity(site):
    return min(
        site['capacity_space'],
        site['capacity_water'],
        site['capacity_sanitation'],
        site['capacity_health'],
        site['capacity_food'],
        site['capacity_road']
    )

def compare_plans(old_plan, new_plan):
    """
    Compares two plans and prints the differences in assignments aggregated by habitation.
    Returns a list of change dicts.
    """
    old_hab_map = {}
    for a in old_plan:
        hab = a['habitation_id']
        if hab not in old_hab_map:
            old_hab_map[hab] = []
        old_hab_map[hab].append(a)
        
    new_hab_map = {}
    for a in new_plan:
        hab = a['habitation_id']
        if hab not in new_hab_map:
            new_hab_map[hab] = []
        new_hab_map[hab].append(a)
        
    print("\n=== BEFORE vs AFTER Comparison ===")
    all_habs = set(old_hab_map.keys()).union(set(new_hab_map.keys()))
    changes = False
    changes_list = []
    
    for hab in sorted(all_habs):
        old_list = old_hab_map.get(hab, [])
        new_list = new_hab_map.get(hab, [])
        
        # Compare counts per site
        old_sites = {}
        for a in old_list:
            old_sites[a['site_id']] = old_sites.get(a['site_id'], 0) + a['people_count']
            
        new_sites = {}
        for a in new_list:
            new_sites[a['site_id']] = new_sites.get(a['site_id'], 0) + a['people_count']
            
        if old_sites != new_sites:
            changes = True
            print(f"Habitation {hab} changed assignments:")
            for site, count in old_sites.items():
                new_c = new_sites.get(site, 0)
                if count > new_c:
                    print(f"  - {count - new_c} people REMOVED from old assignment Site {site}")
                    changes_list.append({
                        "type": "REMOVED",
                        "habitation_id": hab,
                        "site_id": site,
                        "people_count": count - new_c
                    })
            for site, count in new_sites.items():
                old_c = old_sites.get(site, 0)
                if count > old_c:
                    print(f"  + {count - old_c} people ADDED to new assignment Site {site}")
                    changes_list.append({
                        "type": "ADDED",
                        "habitation_id": hab,
                        "site_id": site,
                        "people_count": count - old_c
                    })

    if not changes:
        print("No assignments changed.")
    print("==================================\n")
    return changes_list

def trigger_bridge_collapse(route_id, habitations, sites, routes, old_result):
    print(f"\n>>> EVENT TRIGGERED: Bridge Collapse on Route {route_id} <<<")
    routes[route_id]["status"] = "closed"
    
    new_result = build_and_solve(habitations, sites, routes)
    
    compare_plans(old_result["assignments"], new_result["assignments"])
    return new_result

def trigger_capacity_drop(site_id, drop_percent, habitations, sites, routes, old_result):
    print(f"\n>>> EVENT TRIGGERED: Capacity Drop at Site {site_id} by {drop_percent*100}% <<<")
    # Reduce water capacity
    sites[site_id]["capacity_water"] = int(sites[site_id]["capacity_water"] * (1 - drop_percent))
    
    # Recompute effective capacity
    old_eff = sites[site_id]["effective_capacity"]
    sites[site_id]["effective_capacity"] = recompute_effective_capacity(sites[site_id])
    print(f"Site {site_id} effective capacity dropped from {old_eff} to {sites[site_id]['effective_capacity']}")
    
    new_result = build_and_solve(habitations, sites, routes)
    
    compare_plans(old_result["assignments"], new_result["assignments"])
    return new_result
