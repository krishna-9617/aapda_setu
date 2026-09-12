import os
from ortools.sat.python import cp_model
from data_loader import load_data

def greedy_fallback(habitations, sites, routes):
    """Sort habitations by priority desc, assign to nearest-open site with remaining capacity."""
    
    def route_open(i, j, routes):
        for k, r in routes.items():
            if r['from_habitation_id'] == i and r['to_site_id'] == j and r['status'] == 'open':
                return True
        return False

    def travel_time(i, j, routes):
        times = [r['travel_time_min'] for k, r in routes.items() 
                 if r['from_habitation_id'] == i and r['to_site_id'] == j and r['status'] == 'open']
        return min(times) if times else float('inf')

    remaining_capacity = {j: sites[j]["effective_capacity"] for j in sites}
    assignments = []
    
    # Sort habitations by priority desc
    for i in sorted(habitations, key=lambda h: -habitations[h]["priority_score"]):
        pop_left = habitations[i]["population"]
        crit = habitations[i].get("critical_care_population", 0)
        max_non_health = habitations[i]["population"] - crit
        non_health_assigned = 0
        candidate_sites = sorted(
            (j for j in sites if remaining_capacity[j] > 0 and route_open(i, j, routes)),
            key=lambda j: travel_time(i, j, routes)
        )
        for j in candidate_sites:
            take = min(pop_left, remaining_capacity[j])
            if not sites[j].get("has_healthcare", True):
                take = min(take, max_non_health - non_health_assigned)
            if take > 0:
                if not sites[j].get("has_healthcare", True):
                    non_health_assigned += take
                # Find best route
                best_route = None
                best_time = float('inf')
                for k, r in routes.items():
                    if r['from_habitation_id'] == i and r['to_site_id'] == j and r['status'] == 'open':
                        if r['travel_time_min'] < best_time:
                            best_time = r['travel_time_min']
                            best_route = k
                
                import math
                road_frac = habitations[i].get("road_transit_fraction", 0.7)
                water_frac = 1.0 - road_frac
                buses = math.ceil((take * road_frac) / 40.0)
                boats = math.ceil((take * water_frac) / 15.0)

                assignments.append({
                    "habitation_id": i, 
                    "site_id": j, 
                    "route_id": best_route,
                    "people_count": take,
                    "buses_required": buses,
                    "boats_required": boats
                })
                remaining_capacity[j] -= take
                pop_left -= take
            if pop_left <= 0:
                break
    return {"status": "HEURISTIC", "assignments": assignments}

def naive_nearest_site(habitations, sites, routes):
    assignments = []
    site_assigned = {s: 0 for s in sites}
    
    for i, hab in habitations.items():
        best_site = None
        best_route = None
        min_time = float('inf')
        
        for k, r in routes.items():
            if r['from_habitation_id'] == i and r['status'] == 'open':
                if r['travel_time_min'] < min_time:
                    min_time = r['travel_time_min']
                    best_site = r['to_site_id']
                    best_route = k
                    
        if best_site:
            pop = hab['population']
            assignments.append({
                'habitation_id': i,
                'site_id': best_site,
                'route_id': best_route,
                'people_count': pop,
                'travel_time_min': min_time,
                'risk_score': routes[best_route]['risk_score']
            })
            site_assigned[best_site] += pop
            
    over_capacity_count = 0
    unmet_demand = 0
    for s, count in site_assigned.items():
        cap = sites[s]['effective_capacity']
        if count > cap:
            over_capacity_count += 1
            unmet_demand += (count - cap)
            
    avg_travel_time = sum(a['travel_time_min'] for a in assignments) / len(assignments) if assignments else 0
    avg_risk = sum(a['risk_score'] for a in assignments) / len(assignments) if assignments else 0
    
    return {
        'unmet_demand': unmet_demand,
        'avg_travel_time': avg_travel_time,
        'avg_risk': avg_risk,
        'over_capacity_count': over_capacity_count,
        'assignments': assignments
    }

from site_filtering import filter_candidate_sites

def build_and_solve(habitations, sites, routes):
    model = cp_model.CpModel()
    
    # Pre-filter candidate sites for each habitation
    candidate_sites_for_hab = {}
    filtering_reasons = {}
    for i in habitations:
        candidates, exclusions = filter_candidate_sites(i, habitations, sites, routes)
        candidate_sites_for_hab[i] = candidates
        filtering_reasons[i] = exclusions

    def routes_between(i, j, routes):
        # Stage 1-4 checks: if site j was filtered out for habitation i, return no routes
        if j not in candidate_sites_for_hab.get(i, []):
            return []
        # Return open routes
        return [k for k, r in routes.items() if r['from_habitation_id'] == i and r['to_site_id'] == j and r.get('status', 'open') == 'open']

    # Decision variables: x[i][j][k] = people from habitation i to site j via route k
    x = {}
    for i in habitations:
        for j in sites:
            for k in routes_between(i, j, routes):
                x[i, j, k] = model.NewIntVar(0, habitations[i]["population"], f"x_{i}_{j}_{k}")

    # Unmet demand per habitation
    U = {i: model.NewIntVar(0, habitations[i]["population"], f"U_{i}") for i in habitations}

    # Hard constraint: population conservation
    for i in habitations:
        model.Add(
            sum(x[i, j, k] for j in sites for k in routes_between(i, j, routes))
            + U[i] == habitations[i]["population"]
        )

    # Hard constraint: site capacity
    for j in sites:
        model.Add(
            sum(x[i, j, k] for i in habitations for k in routes_between(i, j, routes))
            <= sites[j]["effective_capacity"]
        )

    # New constraints: Resource tracking for food and medical
    FOOD_PER_PERSON = 3
    MEDICAL_RATIO = 20
    for j in sites:
        model.Add(
            sum(x[i, j, k] * FOOD_PER_PERSON for i in habitations for k in routes_between(i, j, routes))
            <= sites[j].get("food_supply_units", 0)
        )
        model.Add(
            sum(x[i, j, k] for i in habitations for k in routes_between(i, j, routes))
            <= sites[j].get("medical_supply_units", 0) * MEDICAL_RATIO
        )

    # Hard constraint: Critical care population cannot be sent to sites without healthcare
    for i in habitations:
        crit = habitations[i].get("critical_care_population", 0)
        if crit > 0:
            non_health_sum = sum(
                x[i, j, k]
                for j in sites if not sites[j].get("has_healthcare", True)
                for k in routes_between(i, j, routes)
            )
            model.Add(non_health_sum <= habitations[i]["population"] - crit)

    # Hard constraint: closed routes carry zero flow
    for (i, j, k), var in x.items():
        if routes[k]["status"] == "closed":
            model.Add(var == 0)

    # Objective: minimize weighted travel time + risk + distance + priority-weighted unmet demand
    alpha, beta, gamma, lambda_0, eta = 1.0, 2.0, 0.5, 10.0, 1.5
    terms = []
    for (i, j, k), var in x.items():
        cost = alpha * routes[k]["travel_time_min"] + beta * routes[k]["risk_score"] + gamma * routes[k]["distance_km"]
        terms.append(var * int(cost * 100))

    for i in habitations:
        lam_i = lambda_0 * (1 + eta * habitations[i]["priority_score"])
        terms.append(U[i] * int(lam_i * 100))

    model.Minimize(sum(terms))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8.0
    status = solver.Solve(model)

    result = {
        "status": solver.StatusName(status),
        "time_sec": solver.WallTime(),
        "assignments": [],
        "objective": None
    }

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        obj_val = solver.ObjectiveValue() / 100.0
        best_bound = solver.BestObjectiveBound() / 100.0
        gap = 0.0
        if obj_val != 0:
            gap = abs(obj_val - best_bound) / abs(obj_val) * 100.0
            
        result["objective"] = obj_val
        result["gap"] = gap
        
        for (i, j, k), var in x.items():
            val = solver.Value(var)
            if val > 0:
                import math
                road_frac = habitations[i].get("road_transit_fraction", 0.7)
                water_frac = 1.0 - road_frac
                buses = math.ceil((val * road_frac) / 40.0)
                boats = math.ceil((val * water_frac) / 15.0)

                result["assignments"].append({
                    "habitation_id": i, 
                    "site_id": j, 
                    "route_id": k,
                    "people_count": val,
                    "buses_required": buses,
                    "boats_required": boats
                })
                
        result["unmet_demand"] = {}
        for i, var in U.items():
            val = solver.Value(var)
            if val > 0:
                result["unmet_demand"][i] = val
    else:
        # Fallback to greedy
        fallback_res = greedy_fallback(habitations, sites, routes)
        result["status"] = "HEURISTIC FALLBACK"
        result["assignments"] = fallback_res["assignments"]

    result["filtering_reasons"] = filtering_reasons
    return result

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    habitations, sites, routes = load_data(data_dir)
    
    print("Running CP-SAT Optimizer...")
    result = build_and_solve(habitations, sites, routes)
    
    print(f"\n--- Solver Status: {result['status']} ---")
    if result["status"] not in ["HEURISTIC FALLBACK"]:
        print(f"Time: {result['time_sec']:.3f} sec")
        print(f"Objective Value: {result['objective']}")
        
    print("\n--- Assignments ---")
    for a in result["assignments"]:
        print(f"Habitation {a['habitation_id']} -> Site {a['site_id']} via Route {a['route_id']}: {a['people_count']} people")
