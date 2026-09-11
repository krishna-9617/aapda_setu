import json
import urllib.request

base_url = "http://127.0.0.1:8000"

def fetch(path, method="GET", data=None):
    req = urllib.request.Request(base_url + path, method=method)
    if data:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

print("=== 0. Fetch baseline data ===")
sites_data = fetch("/sites")
habitations_data = fetch("/habitations")
total_pop = sum(h["population"] for h in habitations_data.values())
print(f"Total Population: {total_pop}")

print("\n=== 1. Optimize Baseline ===")
plan = fetch("/plans/optimize", "POST")
print("Status:", plan["solver_status"])

print("\n=== 2. Trigger Bridge Collapse (R01) ===")
res_r01 = fetch("/events/bridge-collapse", "POST", {"route_id": "R01"})
print("Status:", res_r01["solver_status"])

print("\n=== 3. Trigger Capacity Drop (SHL-005, 50%) ===")
res_drop = fetch("/events/capacity-drop", "POST", {"site_id": "SHL-005", "drop_percent": 0.5})
print("Status:", res_drop["solver_status"])

print("\n=== 4. Fetch final plan & run checks ===")
final_plan = fetch("/plans/current")

print("\n[CHECK 1: FULL ASSIGNMENTS]")
for a in final_plan["assignments"]:
    print(f"  {a['habitation_id']} -> {a['site_id']} via {a['route_id']} (People: {a['people_count']})")
print(f"  [Unmet Demand]: {json.dumps(final_plan.get('unmet_demand', {}))}")

print("\n[CHECK 2: CAPACITY VERIFICATION]")
site_assigned = {s: 0 for s in sites_data.keys()}
for a in final_plan["assignments"]:
    site_assigned[a["site_id"]] += a["people_count"]

sites_after = fetch("/sites") # Fetch updated sites with new capacity
for s, cap in sites_after.items():
    assigned = site_assigned.get(s, 0)
    eff_cap = cap["effective_capacity"]
    status = "OK" if assigned <= eff_cap else "EXCEEDED!"
    print(f"  {s}: Assigned={assigned} | Capacity={eff_cap} -> {status}")

print("\n[CHECK 3: POPULATION CONSERVATION]")
assigned_total = sum(site_assigned.values())
unmet_total = sum(final_plan.get("unmet_demand", {}).values())
grand_total = assigned_total + unmet_total
print(f"  Total Assigned: {assigned_total}")
print(f"  Total Unmet Demand: {unmet_total}")
print(f"  Grand Total: {grand_total}")
print(f"  Matches Expected (6600)? {'YES' if grand_total == total_pop else 'NO'}")
