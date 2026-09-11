import requests
import json

base_url = "http://127.0.0.1:8000"

print("1. Optimize baseline")
res = requests.post(f"{base_url}/plans/optimize")
print("Status:", res.json().get('solver_status'))

print("\n2. Close R05 (Route to SHL-005)")
res = requests.post(f"{base_url}/events/bridge-collapse", json={"route_id": "R05"})
print("Status:", res.json().get('solver_status'))

print("\n3. Close R08 (Only remaining route for BRP-005)")
res = requests.post(f"{base_url}/events/bridge-collapse", json={"route_id": "R08"})
out = res.json()
print("Status:", out.get('solver_status'))
print("Changed assignments count:", out.get('changed_assignments'))
print("Changes sample:", json.dumps(out.get('changes', [])[:2], indent=2))
