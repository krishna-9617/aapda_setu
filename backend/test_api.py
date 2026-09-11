import urllib.request
import json

base_url = "http://127.0.0.1:8000"

def post(path, data=None):
    url = base_url + path
    req = urllib.request.Request(url, method="POST")
    if data is not None:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        return str(e)

print("=== POST /plans/optimize ===")
opt_res = post("/plans/optimize")
print(f"Status: {opt_res.get('solver_status')}")

print("\n=== POST /events/bridge-collapse ===")
bc_res = post("/events/bridge-collapse", {"route_id": "R01"})
print(json.dumps(bc_res, indent=2))
