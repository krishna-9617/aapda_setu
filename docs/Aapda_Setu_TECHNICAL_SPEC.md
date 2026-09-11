# AAPDA SETU — TECHNICAL IMPLEMENTATION SPEC
## Companion to PROTOTYPE_SCOPE.md — start coding directly from this

This covers the parts the scope doc left out: data schema, CP-SAT code skeleton, API contract, frontend breakdown, and sample numbers for Barpeta. Scope boundaries (what's BUILD/STUB/ROADMAP) are still governed by `Aapda_Setu_PROTOTYPE_SCOPE.md` — this file is "how," not "what."

---

## 1. Data Schema

Use these as your DB tables (Postgres/SQLite fine for a prototype) or, if time-pressed, as pandas DataFrame schemas loaded from CSV/GeoJSON.

### 1.1 `habitations`
| Field | Type | Notes |
|---|---|---|
| `habitation_id` | string (PK) | e.g. `BRP-001` |
| `name` | string | village/ward name |
| `lat`, `lon` | float | centroid |
| `geometry` | GeoJSON polygon | optional, for map rendering |
| `population` | int | Census 2011 scaled forward |
| `vulnerability_score` | float 0–1 | from vulnerability model |
| `hazard_score` | float 0–1 | flood susceptibility |
| `priority_score` | float 0–1 | `f(vulnerability, hazard)` |
| `red_zone_band` | enum | `critical / high / moderate / low` |
| `current_assignment` | string (nullable, FK → plans.plan_id) | active plan reference |

### 1.2 `sites` (candidate relocation shelters)
| Field | Type | Notes |
|---|---|---|
| `site_id` | string (PK) | e.g. `SHL-014` |
| `name` | string | |
| `lat`, `lon` | float | |
| `capacity_space` | int | physical accommodation |
| `capacity_water` | int | |
| `capacity_sanitation` | int | |
| `capacity_health` | int | |
| `capacity_food` | int | |
| `capacity_road` | int | throughput limit |
| `safety_flag` | bool | fails hard filter if inside red zone |
| `effective_capacity` | int | `min()` of all capacity_* — computed field |
| `status` | enum | `active / degraded / closed` (changes on event) |

### 1.3 `routes`
| Field | Type | Notes |
|---|---|---|
| `route_id` | string (PK) | e.g. `R17` |
| `from_habitation_id` | string (FK) | |
| `to_site_id` | string (FK) | |
| `distance_km` | float | |
| `travel_time_min` | float | from OSM |
| `risk_score` | float 0–1 | |
| `status` | enum | `open / closed` |
| `capacity_per_hour` | int | throughput cap |

### 1.4 `plans`
| Field | Type | Notes |
|---|---|---|
| `plan_id` | string (PK) | UUID |
| `created_at` | timestamp | |
| `superseded_by` | string (nullable, FK → plans.plan_id) | STUB versioning |
| `solver_status` | string | `OPTIMAL / FEASIBLE / INFEASIBLE` |
| `solver_gap` | float | |
| `solver_time_sec` | float | |
| `trigger_event_id` | string (nullable) | what caused this plan (null = initial) |

### 1.5 `assignments` (rows of the plan — one per x_ijkp with value > 0)
| Field | Type | Notes |
|---|---|---|
| `plan_id` | string (FK) | |
| `habitation_id` | string (FK) | |
| `site_id` | string (FK) | |
| `route_id` | string (FK) | |
| `phase` | enum | `immediate / short_term / medium_term` |
| `people_count` | int | value of decision variable |
| `eta_minutes` | float | |

### 1.6 `events` (Event Simulator log)
| Field | Type | Notes |
|---|---|---|
| `event_id` | string (PK) | |
| `event_type` | enum | `bridge_collapse / capacity_drop` (2 for MVP) |
| `target_id` | string | route_id or site_id affected |
| `triggered_at` | timestamp | |
| `resulting_plan_id` | string (FK) | |

---

## 2. Effective Capacity — Sample Numbers (use for 3–5 demo shelters)

Pick 3–5 real or synthetic Barpeta shelters and precompute these so the demo isn't running unvalidated live numbers:

```
Shelter: Barpeta Higher Secondary School (SHL-001)
  Physical accommodation   5000
  Water availability       2400
  Sanitation                1800
  Healthcare                1500
  Food supply                2100
  Road throughput            2000
  Safety-adjusted            1700
  ───────────────────────────────
  EFFECTIVE CAPACITY         1500   ← min() of all above
```

Build a small spreadsheet with 5 shelters like this before touching code — validates the formula by hand (this is also your Jury Q9 answer: "we validate against a hand-computable scenario").

---

## 3. CP-SAT Optimizer — Code Skeleton (OR-Tools, Python)

```python
from ortools.sat.python import cp_model

def build_and_solve(habitations, sites, routes, phases=("immediate", "short_term", "medium_term")):
    model = cp_model.CpModel()

    # --- Decision variables: x[i][j][k][p] = people from habitation i to site j via route k in phase p ---
    x = {}
    for i in habitations:
        for j in sites:
            for k in routes_between(i, j, routes):     # only feasible (open) routes
                for p in phases:
                    x[i, j, k, p] = model.NewIntVar(0, habitations[i]["population"], f"x_{i}_{j}_{k}_{p}")

    # unmet demand per habitation
    U = {i: model.NewIntVar(0, habitations[i]["population"], f"U_{i}") for i in habitations}

    # --- Hard constraint: population conservation ---
    for i in habitations:
        model.Add(
            sum(x[i, j, k, p] for j in sites for k in routes_between(i, j, routes) for p in phases)
            + U[i] == habitations[i]["population"]
        )

    # --- Hard constraint: site capacity (cumulative across phases) ---
    for j in sites:
        model.Add(
            sum(x[i, j, k, p] for i in habitations for k in routes_between(i, j, routes) for p in phases)
            <= sites[j]["effective_capacity"]
        )

    # --- Hard constraint: per-phase site capacity ---
    # (use a per-phase throughput fraction of effective_capacity if you don't have separate phase caps)
    for j in sites:
        for p in phases:
            model.Add(
                sum(x[i, j, k, p] for i in habitations for k in routes_between(i, j, routes))
                <= sites[j]["capacity_per_phase"][p]
            )

    # --- Hard constraint: closed routes carry zero flow ---
    for (i, j, k, p), var in x.items():
        if routes[k]["status"] == "closed":
            model.Add(var == 0)

    # --- Objective: minimize weighted travel time + risk + distance + priority-weighted unmet demand ---
    alpha, beta, gamma, lambda_0, eta = 1.0, 2.0, 0.5, 10.0, 1.5
    terms = []
    for (i, j, k, p), var in x.items():
        cost = alpha * routes[k]["travel_time_min"] + beta * routes[k]["risk_score"] + gamma * routes[k]["distance_km"]
        terms.append(var * int(cost * 100))   # scale to int for CP-SAT

    for i in habitations:
        lam_i = lambda_0 * (1 + eta * habitations[i]["priority_score"])
        terms.append(U[i] * int(lam_i * 100))

    model.Minimize(sum(terms))

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8.0   # documented solver limit (Section 15A in master doc)
    status = solver.Solve(model)

    result = {
        "status": solver.StatusName(status),
        "gap": solver.BestObjectiveBound() and None,  # compute gap if needed
        "time_sec": solver.WallTime(),
        "assignments": [],
    }

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (i, j, k, p), var in x.items():
            val = solver.Value(var)
            if val > 0:
                result["assignments"].append({
                    "habitation_id": i, "site_id": j, "route_id": k,
                    "phase": p, "people_count": val,
                })
    else:
        # INFEASIBLE → trigger greedy fallback (see Section 4 below)
        pass

    return result
```

**Notes for whoever builds this:**
- `routes_between(i, j, routes)` — helper that returns route_ids connecting habitation i to site j; precompute this as a dict for speed.
- Scale float costs to int (`* 100`) — CP-SAT wants integer coefficients.
- If `status == INFEASIBLE`, call the greedy fallback (below) and label the output `"heuristic_fallback": true` in the API response — never show INFEASIBLE with no output to a judge.

---

## 4. Greedy Fallback (🟢 — build alongside optimizer, not after)

```python
def greedy_fallback(habitations, sites, routes):
    """Sort habitations by priority desc, assign to nearest-open site with remaining capacity."""
    remaining_capacity = {j: sites[j]["effective_capacity"] for j in sites}
    assignments = []
    for i in sorted(habitations, key=lambda h: -habitations[h]["priority_score"]):
        pop_left = habitations[i]["population"]
        candidate_sites = sorted(
            (j for j in sites if remaining_capacity[j] > 0 and route_open(i, j, routes)),
            key=lambda j: travel_time(i, j, routes)
        )
        for j in candidate_sites:
            take = min(pop_left, remaining_capacity[j])
            if take > 0:
                assignments.append({"habitation_id": i, "site_id": j, "people_count": take})
                remaining_capacity[j] -= take
                pop_left -= take
            if pop_left <= 0:
                break
    return {"status": "HEURISTIC", "assignments": assignments}
```

---

## 5. Event Simulator (2 events for MVP)

```python
def trigger_bridge_collapse(route_id, routes_db):
    routes_db[route_id]["status"] = "closed"
    return re_optimize()

def trigger_capacity_drop(site_id, sites_db, drop_percent=0.5):
    sites_db[site_id]["capacity_water"] *= (1 - drop_percent)
    sites_db[site_id]["effective_capacity"] = recompute_effective_capacity(sites_db[site_id])
    return re_optimize()

def re_optimize():
    result = build_and_solve(habitations, sites, routes)
    if result["status"] == "INFEASIBLE":
        result = greedy_fallback(habitations, sites, routes)
    save_plan(result, superseded=current_plan_id)
    return result
```

---

## 6. API Contract (FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/habitations` | list all, with scores + red-zone band |
| `GET` | `/sites` | list all, with effective capacity |
| `GET` | `/plans/current` | current active plan + assignments |
| `POST` | `/plans/optimize` | run CP-SAT fresh (initial plan) |
| `POST` | `/events/bridge-collapse` | body: `{route_id}` → triggers re-optimization |
| `POST` | `/events/capacity-drop` | body: `{site_id, drop_percent}` → triggers re-optimization |
| `GET` | `/plans/{plan_id}/explain/{habitation_id}` | explainability card data |
| `POST` | `/plans/{plan_id}/approve` | human-in-the-loop approve |
| `POST` | `/plans/{plan_id}/reject` | human-in-the-loop reject |

Sample response for `POST /events/bridge-collapse`:
```json
{
  "event_id": "EVT-002",
  "new_plan_id": "PLAN-0007",
  "solver_status": "OPTIMAL",
  "solver_gap": 0.0,
  "solver_time_sec": 1.8,
  "changed_assignments": 14,
  "affected_habitations": ["BRP-003", "BRP-011"]
}
```

---

## 7. Frontend Component Breakdown (React + MapLibre)

```
src/
  components/
    MapView.jsx           — base map, red-zone overlay, habitation/shelter markers
    AssignmentLines.jsx    — draws lines habitation → assigned site
    PriorityQueue.jsx      — sidebar list of habitations ranked by priority
    ExplainabilityCard.jsx — modal/panel on marker click: why this assignment
    SolverStatusBadge.jsx  — "OPTIMAL, gap 0%, 1.8s" pill, top-right of map
    EventControls.jsx      — 2 buttons: "Simulate Bridge Collapse", "Simulate Capacity Drop"
    PlanApprovalPanel.jsx  — Approve / Reject / Modify(text note) buttons
  pages/
    Dashboard.jsx           — composes MapView + PriorityQueue + SolverStatusBadge
```

**Demo flow wiring:** `EventControls` → API call → poll `/plans/current` → re-render `MapView` + `SolverStatusBadge` with new plan. Keep this as a simple refetch, not websockets — not worth the complexity for an 8-second solve.

---

## 8. Build Order (maps to the 21-day plan in PROTOTYPE_SCOPE.md)

1. Schema + load Barpeta CSV/GeoJSON data into it (Days 1–3)
2. Hazard/vulnerability/priority scoring functions, effective capacity calc (Days 4–8)
3. CP-SAT skeleton above, wired to real data, tested on 5-shelter hand-computed case first (Days 9–12)
4. Greedy fallback + event simulator + re-optimize wiring (Days 9–12, parallel with above if 2 people on backend)
5. API endpoints (Day 12–13)
6. Frontend components, wired to API (Days 13–16)
7. Explainability card + solver status badge (Day 16–17)
8. Integration test full Golden Demo Path end-to-end (Days 17–19)

---

## 9. What This Spec Deliberately Skips

Per PROTOTYPE_SCOPE.md — do not build: multi-hazard scoring, multi-district routing, ML layer, live SMS/Sachet integration, full audit-log UI, role-based views. If you find yourself writing code for any of these, stop and check the scope doc first.
