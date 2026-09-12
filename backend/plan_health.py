
def calculate_plan_health(current_plan, habitations, sites, routes):
    if not current_plan:
        return {"status": "UNKNOWN", "unmet_demand_total": 0, "interventions": []}

    unmet_total = sum(current_plan.get("unmet_demand", {}).values())
    status = "HEALTHY" if unmet_total == 0 else "AT RISK"

    interventions = []
    
    if unmet_total > 0:
        # Calculate site utilization
        site_usage = {sid: 0 for sid in sites}
        for a in current_plan["assignments"]:
            site_usage[a["site_id"]] += a["people_count"]
            
        # Find bottlenecks
        for sid, usage in site_usage.items():
            site = sites[sid]
            eff_cap = site["effective_capacity"]
            if eff_cap > 0 and usage >= eff_cap:
                # This site is full. What is the limiting resource?
                resources = {
                    "capacity_space": site["capacity_space"],
                    "capacity_water": site["capacity_water"],
                    "capacity_sanitation": site["capacity_sanitation"],
                    "capacity_health": site["capacity_health"],
                    "capacity_food": site["capacity_food"],
                    "capacity_road": site["capacity_road"]
                }
                limiting_resource = min(resources, key=resources.get)
                # Recommend increasing this resource
                increase_amount = min(unmet_total, 500) # Suggest meaningful chunk
                interventions.append({
                    "id": f"cap_{sid}_{limiting_resource}",
                    "type": "increase_capacity",
                    "site_id": sid,
                    "resource_type": limiting_resource,
                    "amount": increase_amount,
                    "title": f"Increase {limiting_resource.replace('capacity_', '')} at {site['name']}",
                    "description": f"Increase {limiting_resource.replace('capacity_', '')} by {increase_amount} units to accommodate more people.",
                    "impact": f"May resolve up to {increase_amount} unmet demand."
                })
                
        # Find spare capacity
        spare_caps = []
        for sid, usage in site_usage.items():
            site = sites[sid]
            spare = site["effective_capacity"] - usage
            if spare > 0:
                spare_caps.append((spare, sid))
                
        if spare_caps:
            spare_caps.sort(reverse=True)
            best_spare, best_sid = spare_caps[0]
            
            # Find habitation with unmet demand
            for hid, unmet in current_plan.get("unmet_demand", {}).items():
                if unmet > 0:
                    # Check if route exists
                    route_exists = False
                    for r in routes.values():
                        if r["from_habitation_id"] == hid and r["to_site_id"] == best_sid and r["status"] == "open":
                            route_exists = True
                            break
                    if not route_exists:
                        hab_name = habitations[hid]["name"]
                        site_name = sites[best_sid]["name"]
                        interventions.append({
                            "id": f"route_{hid}_{best_sid}",
                            "type": "open_route",
                            "habitation_id": hid,
                            "site_id": best_sid,
                            "title": f"Open emergency route: {hab_name} to {site_name}",
                            "description": f"Establish a new transit route to {site_name}, which has {best_spare} spare capacity.",
                            "impact": f"Could route {min(unmet, best_spare)} currently stranded people."
                        })
                        break
                        
    # Limit to top 3 interventions for UI cleanliness
    return {
        "status": status,
        "unmet_demand_total": unmet_total,
        "interventions": interventions[:3]
    }

