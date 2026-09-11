"""
Aapda Setu — Full End-to-End Verification Suite
Tests A through F against the live backend at http://127.0.0.1:8000
"""
import json
import urllib.request
import sys

BASE = "http://127.0.0.1:8000"
TOTAL_POP = 6600  # sum of all habitation populations

def api(path, method="GET", data=None):
    req = urllib.request.Request(BASE + path, method=method)
    if data:
        req.data = json.dumps(data).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def capacity_check(plan, sites_snapshot):
    """Returns True if no site is over-assigned."""
    site_assigned = {}
    for a in plan["assignments"]:
        site_assigned[a["site_id"]] = site_assigned.get(a["site_id"], 0) + a["people_count"]
    ok = True
    for sid, assigned in site_assigned.items():
        cap = sites_snapshot[sid]["effective_capacity"]
        if assigned > cap:
            print(f"    FAIL: {sid} assigned={assigned} > capacity={cap}")
            ok = False
        else:
            print(f"    {sid}: {assigned}/{cap} OK")
    # Print sites with 0 assigned
    for sid in sites_snapshot:
        if sid not in site_assigned:
            print(f"    {sid}: 0/{sites_snapshot[sid]['effective_capacity']} OK")
    return ok

def pop_conservation(plan):
    """Returns True if assigned + unmet == TOTAL_POP."""
    assigned = sum(a["people_count"] for a in plan["assignments"])
    unmet = sum(plan.get("unmet_demand", {}).values())
    total = assigned + unmet
    print(f"    Assigned={assigned}  Unmet={unmet}  Total={total}  Expected={TOTAL_POP}")
    return total == TOTAL_POP

results = {}

# ═══════════════════════════════════
# TEST A — Clean baseline
# ═══════════════════════════════════
print("=" * 60)
print("TEST A — Clean Baseline")
print("=" * 60)

# Reset first
code, _ = api("/plans/reset", "POST")
print(f"  Reset: HTTP {code}")

code, plan = api("/plans/current")
print(f"  GET /plans/current: HTTP {code}")
print(f"  solver_status: {plan['solver_status']}")
print(f"  objective: {plan.get('objective')}")
print(f"  assignments: {len(plan['assignments'])}")
print(f"  unmet_demand: {plan.get('unmet_demand', {})}")

_, sites_snap = api("/sites")

cap_ok = capacity_check(plan, sites_snap)
pop_ok = pop_conservation(plan)
status_ok = plan["solver_status"] == "OPTIMAL"
obj_ok = plan.get("objective") is not None and 50000 < plan["objective"] < 60000

test_a = status_ok and cap_ok and pop_ok and obj_ok
results["A"] = "PASS" if test_a else "FAIL"
print(f"\n  TEST A: {results['A']}\n")

# ═══════════════════════════════════
# TEST B — Single event: bridge collapse R01
# ═══════════════════════════════════
print("=" * 60)
print("TEST B — Bridge Collapse (R01)")
print("=" * 60)

api("/plans/reset", "POST")
code, evt = api("/events/bridge-collapse", "POST", {"route_id": "R01"})
print(f"  POST bridge-collapse: HTTP {code}")
print(f"  solver_status: {evt.get('solver_status')}")
print(f"  changed_assignments: {evt.get('changed_assignments')}")

_, plan_b = api("/plans/current")
_, sites_b = api("/sites")

cap_ok = capacity_check(plan_b, sites_b)
pop_ok = pop_conservation(plan_b)

test_b = code == 200 and cap_ok and pop_ok
results["B"] = "PASS" if test_b else "FAIL"
print(f"\n  TEST B: {results['B']}\n")

# ═══════════════════════════════════
# TEST C — Single event: capacity drop SHL-005
# ═══════════════════════════════════
print("=" * 60)
print("TEST C — Capacity Drop (SHL-005, 50%)")
print("=" * 60)

api("/plans/reset", "POST")
code, evt = api("/events/capacity-drop", "POST", {"site_id": "SHL-005", "drop_percent": 0.5})
print(f"  POST capacity-drop: HTTP {code}")
print(f"  solver_status: {evt.get('solver_status')}")

_, plan_c = api("/plans/current")
_, sites_c = api("/sites")

print(f"  SHL-005 effective_capacity after drop: {sites_c['SHL-005']['effective_capacity']}")

cap_ok = capacity_check(plan_c, sites_c)
pop_ok = pop_conservation(plan_c)

test_c = code == 200 and cap_ok and pop_ok
results["C"] = "PASS" if test_c else "FAIL"
print(f"\n  TEST C: {results['C']}\n")

# ═══════════════════════════════════
# TEST D — Chained events
# ═══════════════════════════════════
print("=" * 60)
print("TEST D — Chained: Bridge R01 + Capacity Drop SHL-005")
print("=" * 60)

api("/plans/reset", "POST")
code1, evt1 = api("/events/bridge-collapse", "POST", {"route_id": "R01"})
print(f"  Bridge collapse: HTTP {code1}, status={evt1.get('solver_status')}")

code2, evt2 = api("/events/capacity-drop", "POST", {"site_id": "SHL-005", "drop_percent": 0.5})
print(f"  Capacity drop: HTTP {code2}, status={evt2.get('solver_status')}")

_, plan_d = api("/plans/current")
_, sites_d = api("/sites")

cap_ok = capacity_check(plan_d, sites_d)
pop_ok = pop_conservation(plan_d)

test_d = code1 == 200 and code2 == 200 and cap_ok and pop_ok
results["D"] = "PASS" if test_d else "FAIL"
print(f"\n  TEST D: {results['D']}\n")

# ═══════════════════════════════════
# TEST E — Forced infeasibility → greedy fallback
# ═══════════════════════════════════
print("=" * 60)
print("TEST E — Forced Infeasibility -> Greedy Fallback")
print("=" * 60)

api("/plans/reset", "POST")
# Close R05 and R08 to strand BRP-005 and cut SHL-005 access from BRP-003
api("/events/bridge-collapse", "POST", {"route_id": "R05"})
api("/events/bridge-collapse", "POST", {"route_id": "R08"})
# Now close R03 to strand BRP-002
api("/events/bridge-collapse", "POST", {"route_id": "R03"})
# Close R04 to remove BRP-003 from SHL-002
api("/events/bridge-collapse", "POST", {"route_id": "R04"})

_, plan_e = api("/plans/current")
status_e = plan_e["solver_status"]
print(f"  solver_status: {status_e}")
print(f"  assignments: {len(plan_e['assignments'])}")

# The solver should still return OPTIMAL (thanks to U[i] slack) — 
# but with significant unmet demand. If it said HEURISTIC FALLBACK, that's also acceptable.
pop_ok = pop_conservation(plan_e)
not_crashed = status_e in ("OPTIMAL", "FEASIBLE", "HEURISTIC FALLBACK")

test_e = not_crashed and pop_ok
results["E"] = "PASS" if test_e else "FAIL"
print(f"\n  TEST E: {results['E']}\n")

# ═══════════════════════════════════
# TEST F — Invalid input handling
# ═══════════════════════════════════
print("=" * 60)
print("TEST F — Invalid Input (R99)")
print("=" * 60)

api("/plans/reset", "POST")
code_f, body_f = api("/events/bridge-collapse", "POST", {"route_id": "R99"})
print(f"  HTTP status: {code_f}")
print(f"  Response: {json.dumps(body_f)}")

code_f2, body_f2 = api("/events/capacity-drop", "POST", {"site_id": "SHL-999", "drop_percent": 0.5})
print(f"  Invalid site HTTP status: {code_f2}")
print(f"  Response: {json.dumps(body_f2)}")

test_f = code_f == 400 and code_f2 == 400
results["F"] = "PASS" if test_f else "FAIL"
print(f"\n  TEST F: {results['F']}\n")

# ═══════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════
print("=" * 60)
print("FINAL RESULTS")
print("=" * 60)
for test, result in results.items():
    icon = "[PASS]" if result == "PASS" else "[FAIL]"
    print(f"  {icon} Test {test}: {result}")

all_pass = all(r == "PASS" for r in results.values())
print(f"\n  Overall: {'ALL PASS' if all_pass else 'SOME FAILED'}")

# Reset to clean baseline for demo readiness
api("/plans/reset", "POST")
print("\n  [State reset to clean baseline for demo]")
