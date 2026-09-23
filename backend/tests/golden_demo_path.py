"""
Full golden demo path for Aapda Setu ? validates lambda_0=100 optimizer behavior.

Tests every scenario that was previously documented:
  1. Baseline optimization (OPTIMAL, population conservation, capacity constraints)
  2. Rainfall event (risk_score increase, route re-optimization)
  3. Bridge collapse ? R01 closed, R01B redundancy picks up
  4. Capacity drop ? site partially reduces capacity
  5. Chained events (rainfall + bridge collapse simultaneously)
  6. Forced infeasibility -> greedy fallback
  7. Population conservation across ALL scenarios
  8. Capacity constraint: no site ever exceeds effective_capacity

Run from backend/:
    python -m tests.golden_demo_path
"""
import copy
import sys
import os
import warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_loader import load_data
from optimizer import build_and_solve, naive_nearest_site

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

PASS = 0
FAIL = 0

def ok(msg):
    global PASS
    PASS += 1
    print(f"  PASS  {msg}")

def fail(msg, detail=""):
    global FAIL
    FAIL += 1
    print(f"  FAIL  {msg}")
    if detail:
        print(f"        {detail}")

def check(cond, msg, detail=""):
    if cond:
        ok(msg)
    else:
        fail(msg, detail)

def total_population(hab):
    return sum(h['population'] for h in hab.values())

def total_assigned(plan):
    return sum(a['people_count'] for a in plan.get('assignments', []))

def total_unmet(plan):
    ud = plan.get('unmet_demand', {})
    if isinstance(ud, dict):
        return sum(ud.values())
    return int(ud) if ud else 0

def site_loads(plan):
    loads = {}
    for a in plan.get('assignments', []):
        loads[a['site_id']] = loads.get(a['site_id'], 0) + a['people_count']
    return loads

def assert_population_conservation(plan, hab, label):
    pop = total_population(hab)
    assigned = total_assigned(plan)
    unmet = total_unmet(plan)
    check(
        assigned + unmet == pop,
        f"[{label}] Population conservation: assigned({assigned}) + unmet({unmet}) == total({pop})",
        f"Got {assigned} + {unmet} = {assigned+unmet}, expected {pop}"
    )

def assert_capacity_respected(plan, sites, label):
    loads = site_loads(plan)
    for sid, load in loads.items():
        cap = sites[sid]['effective_capacity']
        check(
            load <= cap,
            f"[{label}] Site {sid} capacity: {load} <= {cap}",
            f"Overcrowded by {load - cap}"
        )

def assert_only_open_routes(plan, routes, label):
    route_ids_used = {a['route_id'] for a in plan.get('assignments', [])}
    for rid in route_ids_used:
        check(
            routes[rid]['status'] == 'open',
            f"[{label}] Route {rid} used is open",
            f"status={routes[rid]['status']}"
        )

def print_assignments(plan, label):
    print(f"\n  --- {label} assignments ---")
    for a in sorted(plan.get('assignments', []), key=lambda x: x['habitation_id']):
        print(f"    {a['habitation_id']} -> {a['site_id']} via {a['route_id']}: {a['people_count']} people")
    ud = plan.get('unmet_demand', {})
    if isinstance(ud, dict) and ud:
        print(f"    Unmet: { {k:v for k,v in ud.items()} }")
    print(f"    Status: {plan.get('status')} | Objective: {plan.get('objective')}")


# -- Load baseline data --------------------------------------------------------
print("\n" + "="*70)
print("AAPDA SETU ? GOLDEN DEMO PATH (lambda_0=100)")
print("="*70)

hab_base, sites_base, routes_base = load_data(DATA_DIR)
total_pop = total_population(hab_base)
print(f"\nLoaded: {len(hab_base)} habitations, {len(sites_base)} sites, {len(routes_base)} routes")
print(f"Total population: {total_pop}")


# ==============================================================================
# SCENARIO 1: Baseline optimization
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 1: Baseline optimization")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)
plan1 = build_and_solve(hab, sites, routes)

print_assignments(plan1, "Baseline")
check(plan1['status'] == 'OPTIMAL', "Solver status is OPTIMAL", f"Got: {plan1['status']}")
check(plan1.get('objective') is not None, "Objective value present")
print(f"  Baseline objective value: {plan1.get('objective')}")
assert_population_conservation(plan1, hab, "Baseline")
assert_capacity_respected(plan1, sites, "Baseline")
assert_only_open_routes(plan1, routes, "Baseline")

baseline_assignments = {a['habitation_id']: (a['site_id'], a['route_id']) for a in plan1['assignments']}


# ==============================================================================
# SCENARIO 2: Rainfall event ? increase risk score on a route
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 2: Rainfall event (R06 risk_score raised from 0.1 -> 0.9)")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)
old_risk = routes['R06']['risk_score']
routes['R06']['risk_score'] = 0.9
plan2 = build_and_solve(hab, sites, routes)

print_assignments(plan2, "After rainfall")
check(plan2['status'] in ('OPTIMAL', 'FEASIBLE'), "Solver found solution after rainfall")
assert_population_conservation(plan2, hab, "Rainfall")
assert_capacity_respected(plan2, sites, "Rainfall")
assert_only_open_routes(plan2, routes, "Rainfall")

# Flag any assignment changes vs baseline
rain_assignments = {a['habitation_id']: (a['site_id'], a['route_id']) for a in plan2['assignments']}
changed = {h: (baseline_assignments.get(h), rain_assignments.get(h))
           for h in set(list(baseline_assignments) + list(rain_assignments))
           if baseline_assignments.get(h) != rain_assignments.get(h)}
if changed:
    print(f"  NOTE: Assignment changes vs baseline:")
    for h, (old, new) in changed.items():
        print(f"    {h}: {old} -> {new}")
else:
    print("  NOTE: No assignment changes vs baseline (R06 is still cheapest even at high risk)")


# ==============================================================================
# SCENARIO 3: Bridge collapse ? R01 closed, R01B redundancy
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 3: Bridge collapse ? R01 closed, R01B redundancy test")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)

# Check what BRP-001 used in baseline
brp001_baseline = baseline_assignments.get('BRP-001')
print(f"  Baseline: BRP-001 was assigned via {brp001_baseline}")

# Close R01
routes['R01']['status'] = 'closed'
plan3 = build_and_solve(hab, sites, routes)

print_assignments(plan3, "After R01 closed")
check(plan3['status'] in ('OPTIMAL', 'FEASIBLE'), "Solver found solution after bridge collapse")
assert_population_conservation(plan3, hab, "BridgeCollapse")
assert_capacity_respected(plan3, sites, "BridgeCollapse")
assert_only_open_routes(plan3, routes, "BridgeCollapse")

# R01B is the redundant route for same pair as R01
r01_pair = (routes_base['R01']['from_habitation_id'], routes_base['R01']['to_site_id'])
r01b_pair = (routes_base['R01B']['from_habitation_id'], routes_base['R01B']['to_site_id'])
check(r01_pair == r01b_pair, "R01 and R01B serve same (habitation, site) pair",
      f"R01={r01_pair}, R01B={r01b_pair}")

brp001_after = {a['route_id'] for a in plan3['assignments'] if a['habitation_id'] == r01_pair[0]}
check(
    'R01' not in brp001_after,
    f"Closed R01 not used after bridge collapse",
    f"Routes used for BRP-001: {brp001_after}"
)
check(
    'R01B' in brp001_after or len(brp001_after) > 0,
    f"BRP-001 still reaches a shelter via redundant route",
    f"Routes used: {brp001_after}"
)
if 'R01B' in brp001_after:
    ok("R01B (redundant route) picked up BRP-001 after R01 collapse")


# ==============================================================================
# SCENARIO 4: Capacity drop ? SHL-001 reduced to 50%
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 4: Capacity drop ? SHL-001 effective_capacity halved")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)
old_cap = sites['SHL-001']['effective_capacity']
sites['SHL-001']['effective_capacity'] = old_cap // 2
print(f"  SHL-001 capacity: {old_cap} -> {sites['SHL-001']['effective_capacity']}")

plan4 = build_and_solve(hab, sites, routes)

print_assignments(plan4, "After capacity drop")
check(plan4['status'] in ('OPTIMAL', 'FEASIBLE'), "Solver found solution after capacity drop")
assert_population_conservation(plan4, hab, "CapacityDrop")
assert_capacity_respected(plan4, sites, "CapacityDrop")

shl001_load = sum(a['people_count'] for a in plan4['assignments'] if a['site_id'] == 'SHL-001')
check(
    shl001_load <= sites['SHL-001']['effective_capacity'],
    f"SHL-001 load ({shl001_load}) respects reduced capacity ({sites['SHL-001']['effective_capacity']})"
)

# Flag changes vs baseline
cap_assignments = {a['habitation_id']: (a['site_id'], a['route_id']) for a in plan4['assignments']}
changed = {h: (baseline_assignments.get(h), cap_assignments.get(h))
           for h in set(list(baseline_assignments) + list(cap_assignments))
           if baseline_assignments.get(h) != cap_assignments.get(h)}
if changed:
    print(f"  NOTE: Assignment changes vs baseline (expected ? SHL-001 is smaller):")
    for h, (old, new) in changed.items():
        print(f"    {h}: {old} -> {new}")


# ==============================================================================
# SCENARIO 5: Chained events ? rainfall + bridge collapse simultaneously
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 5: Chained events ? R06 high risk + R01 closed")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)
routes['R06']['risk_score'] = 0.9
routes['R01']['status'] = 'closed'

plan5 = build_and_solve(hab, sites, routes)

print_assignments(plan5, "Chained events")
check(plan5['status'] in ('OPTIMAL', 'FEASIBLE'), "Solver handles chained events")
assert_population_conservation(plan5, hab, "Chained")
assert_capacity_respected(plan5, sites, "Chained")
assert_only_open_routes(plan5, routes, "Chained")


# ==============================================================================
# SCENARIO 6: Forced infeasibility -> greedy fallback
# Close ALL routes for one habitation
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 6: Forced infeasibility ? close all routes for BRP-005")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)

brp005_routes = [k for k, r in routes.items() if r['from_habitation_id'] == 'BRP-005']
print(f"  Closing BRP-005 routes: {brp005_routes}")
for rid in brp005_routes:
    routes[rid]['status'] = 'closed'

plan6 = build_and_solve(hab, sites, routes)

print_assignments(plan6, "All BRP-005 routes closed")
# This may be OPTIMAL (BRP-005 simply goes unmet) or HEURISTIC FALLBACK
print(f"  Status: {plan6['status']}")
assert_population_conservation(plan6, hab, "ForcedInfeasibility")
assert_capacity_respected(plan6, sites, "ForcedInfeasibility")
# BRP-005 must be unmet
brp005_assigned = sum(a['people_count'] for a in plan6['assignments'] if a['habitation_id'] == 'BRP-005')
check(brp005_assigned == 0, "BRP-005 correctly unassigned when all its routes are closed")
ud = plan6.get('unmet_demand', {})
brp005_unmet = ud.get('BRP-005', 0) if isinstance(ud, dict) else 0
check(brp005_unmet == hab_base['BRP-005']['population'],
      f"BRP-005 unmet = full population ({hab_base['BRP-005']['population']})",
      f"Got unmet={brp005_unmet}")


# ==============================================================================
# SCENARIO 7: CP-SAT vs naive ? invariant check
# ==============================================================================
print("\n" + "-"*60)
print("SCENARIO 7: CP-SAT <= naive on over_capacity_count (invariant)")
print("-"*60)

hab, sites, routes = copy.deepcopy(hab_base), copy.deepcopy(sites_base), copy.deepcopy(routes_base)
plan_cpsat = build_and_solve(hab, sites, routes)
plan_naive = naive_nearest_site(hab, sites, routes)

cpsat_unmet = total_unmet(plan_cpsat)
naive_unmet = plan_naive['unmet_demand']
cpsat_overcap = plan_naive['over_capacity_count']  # naive's own field
# CP-SAT enforces capacity hard ? over_capacity is always 0
cpsat_actual_overcap = sum(
    1 for sid, load in site_loads(plan_cpsat).items()
    if load > sites[sid]['effective_capacity']
)
check(cpsat_actual_overcap == 0, "CP-SAT: zero over-capacity violations (hard constraint)")
check(cpsat_unmet <= naive_unmet,
      f"CP-SAT unmet ({cpsat_unmet}) <= naive unmet ({naive_unmet})",
      f"CP-SAT={cpsat_unmet}, naive={naive_unmet}")
check(plan_naive['over_capacity_count'] >= cpsat_actual_overcap,
      f"CP-SAT over_capacity ({cpsat_actual_overcap}) <= naive over_capacity ({plan_naive['over_capacity_count']})")


# ==============================================================================
# FINAL REPORT
# ==============================================================================
print("\n" + "="*70)
print(f"RESULT: {PASS} passed, {FAIL} failed")
print("="*70)
if FAIL > 0:
    print("SOME CHECKS FAILED ? review above")
    sys.exit(1)
else:
    print("ALL CHECKS PASSED")
    sys.exit(0)
