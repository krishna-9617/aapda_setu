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
        
        # Compare counts per site and route
        old_sites = {}
        for a in old_list:
            key = (a['site_id'], a['route_id'])
            old_sites[key] = old_sites.get(key, 0) + a['people_count']
            
        new_sites = {}
        for a in new_list:
            key = (a['site_id'], a['route_id'])
            new_sites[key] = new_sites.get(key, 0) + a['people_count']
            
        if old_sites != new_sites:
            changes = True
            print(f"Habitation {hab} changed assignments:")
            for key, count in old_sites.items():
                site, route = key
                new_c = new_sites.get(key, 0)
                if count > new_c:
                    print(f"  - {count - new_c} people REMOVED from old assignment Site {site} via Route {route}")
                    changes_list.append({
                        "type": "REMOVED",
                        "habitation_id": hab,
                        "site_id": site,
                        "route_id": route,
                        "people_count": count - new_c
                    })
            for key, count in new_sites.items():
                site, route = key
                old_c = old_sites.get(key, 0)
                if count > old_c:
                    print(f"  + {count - old_c} people ADDED to new assignment Site {site} via Route {route}")
                    changes_list.append({
                        "type": "ADDED",
                        "habitation_id": hab,
                        "site_id": site,
                        "route_id": route,
                        "people_count": count - old_c
                    })

    if not changes:
        print("No assignments changed.")
    print("==================================\n")
    return changes_list

def trigger_bridge_collapse(route_id, habitations, sites, routes, old_result):
    print(f"\n>>> EVENT TRIGGERED: Bridge Collapse on Route {route_id} <<<")
    routes[route_id]["status"] = "closed"
    
    # Generate invalidation reason
    affected_people = 0
    affected_habs = set()
    if old_result:
        for a in old_result["assignments"]:
            if a["route_id"] == route_id:
                affected_people += a["people_count"]
                affected_habs.add(habitations[a["habitation_id"]]["name"])
                
    hab_list_str = ", ".join(sorted(affected_habs))
    if not hab_list_str:
        hab_list_str = "No habitations"
        
    invalidation_reason = f"Route {route_id} (used by {affected_people} people) is no longer passable. {hab_list_str}' current assignments are invalidated."
    
    new_result = build_and_solve(habitations, sites, routes)
    new_result["invalidation_reason"] = invalidation_reason
    
    if old_result:
        compare_plans(old_result["assignments"], new_result["assignments"])
    return new_result

def trigger_capacity_drop(site_id, drop_percent, habitations, sites, routes, old_result):
    print(f"\n>>> EVENT TRIGGERED: Capacity Drop at Site {site_id} by {drop_percent*100}% <<<")
    # Reduce water capacity
    sites[site_id]["capacity_water"] = int(sites[site_id]["capacity_water"] * (1 - drop_percent))
    
    # Recompute effective capacity
    old_eff = sites[site_id]["effective_capacity"]
    sites[site_id]["effective_capacity"] = recompute_effective_capacity(sites[site_id])
    new_eff = sites[site_id]["effective_capacity"]
    print(f"Site {site_id} effective capacity dropped from {old_eff} to {new_eff}")
    
    # Generate invalidation reason
    assigned_people = 0
    if old_result:
        assigned_people = sum(a["people_count"] for a in old_result["assignments"] if a["site_id"] == site_id)
    site_name = sites[site_id]["name"]
    drop_pct = int(drop_percent * 100)
    invalidation_reason = f"{site_name}'s effective capacity dropped from {old_eff} to {new_eff} ({drop_pct}% reduction). {assigned_people} people currently assigned there exceed the new limit."
    
    new_result = build_and_solve(habitations, sites, routes)
    new_result["invalidation_reason"] = invalidation_reason
    
    if old_result:
        compare_plans(old_result["assignments"], new_result["assignments"])
    return new_result

def trigger_rainfall_event(intensity, habitations, sites, routes, current_plan=None):
    """
    Simulates a rainfall event that increases hazard scores.
    intensity: float 0-1 (e.g., 0.3 for light, 0.9 for severe)
    """
    amplification_factor = 0.5
    changed_count = 0
    original_bands = {hid: hab["red_zone_band"] for hid, hab in habitations.items()}
    
    for hid, hab in habitations.items():
        # Increase hazard score
        new_hazard = min(1.0, hab["hazard_score"] + (intensity * amplification_factor))
        hab["hazard_score"] = new_hazard
        
        # Recompute priority score
        new_priority = (new_hazard + hab["vulnerability_score"]) / 2.0
        hab["priority_score"] = new_priority
        
        # Recompute red_zone_band
        if new_priority >= 0.8:
            band = "critical"
        elif new_priority >= 0.6:
            band = "high"
        elif new_priority >= 0.4:
            band = "moderate"
        else:
            band = "low"
        
        hab["red_zone_band"] = band
        if band != original_bands[hid]:
            changed_count += 1
            
    invalidation_reason = f"Rainfall intensity {intensity} has amplified hazard scores. {changed_count} habitations changed priority classification, requiring plan re-evaluation."
        
    print(f"\n[EVENT] Simulated Rainfall (Intensity: {intensity}). Hazard scores amplified.")
    result = build_and_solve(habitations, sites, routes)
    result["invalidation_reason"] = invalidation_reason
    
    if current_plan:
        compare_plans(current_plan["assignments"], result["assignments"])
    return result

