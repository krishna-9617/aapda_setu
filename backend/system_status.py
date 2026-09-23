"""
System modules overview.

Backs the module-overview grid on the landing page. Every status value here is
computed from live backend state at request time. Nothing is hardcoded, and
nothing is invented: when a module genuinely has no value to report, its
`status_value` is None and the UI renders an em dash rather than a plausible
placeholder.

Each entry carries the frontend route it links to, so adding a module here is
enough to add a card — the frontend does not keep its own copy of the list.
"""

import logging

logger = logging.getLogger(__name__)

# Seats per vehicle, mirroring the fleet arithmetic in optimizer.py.
SEATS_PER_BUS = 40
SEATS_PER_BOAT = 15


def _safe(callable_, default=None):
    """
    Evaluate a status probe, returning `default` if it raises.

    A module whose status cannot be computed must degrade to "unavailable" and
    leave the rest of the grid intact; one broken probe should never take down
    the whole overview.
    """
    try:
        return callable_()
    except Exception as exc:  # noqa: BLE001 - a probe failure is never fatal here
        logger.warning("Status probe failed: %s: %s", type(exc).__name__, exc)
        return default


def _optimizer_module(current_plan):
    if not current_plan:
        return None, "No active plan"

    status = current_plan.get("solver_status")
    time_sec = current_plan.get("solver_time_sec")
    if time_sec is None:
        return status, "Solver status"
    return status, f"Solved in {time_sec * 1000:.0f} ms"


def _hazard_module(habitations):
    if not habitations:
        return None, "No habitations loaded"

    derived = sum(
        1 for h in habitations.values() if h.get("hazard_score_source") == "derived"
    )
    total = len(habitations)
    if derived == 0:
        return None, "Scores from CSV - run geo.derive_hazard"
    return f"{derived}/{total}", "Habitations with self-derived scores"


def _routing_module(routes):
    if not routes:
        return None, "No routes loaded"

    on_road = sum(
        1 for r in routes.values() if r.get("geometry_source") == "osm_road_network"
    )
    total = len(routes)
    if on_road == 0:
        return None, "Straight-line estimates - run geo.derive_routes"
    return f"{on_road}/{total}", "Routes following real road geometry"


def _plan_health_module(health):
    if not health:
        return None, "Health not computed"
    unmet = health.get("unmet_demand_total", 0)
    return health.get("status"), f"{unmet:,} people unplaced"


def _approval_module(pending_plan, plan_history):
    versions = len(plan_history or [])
    if pending_plan:
        return "1 pending", f"{versions} plan version(s) on record"
    return "Up to date", f"{versions} plan version(s) on record"


def _audit_module(audit_log):
    entries = len(audit_log or [])
    if entries == 0:
        return None, "No actions recorded yet"
    return f"{entries}", "Recorded actions this session"


def _field_report_module(audit_log):
    reports = sum(
        1 for entry in (audit_log or []) if "Field Report" in (entry.get("description") or "")
    )
    if reports == 0:
        return None, "No field reports submitted"
    return f"{reports}", "Field reports submitted"


def _what_if_module(habitations):
    if not habitations:
        return None, "No habitations loaded"
    return f"{len(habitations)}", "Habitations available to vary"


def _fleet_module(current_plan):
    if not current_plan or not current_plan.get("assignments"):
        return None, "No assignments to move"

    buses = sum(a.get("buses_required", 0) for a in current_plan["assignments"])
    boats = sum(a.get("boats_required", 0) for a in current_plan["assignments"])
    return f"{buses} bus / {boats} boat", (
        f"Seats for {buses * SEATS_PER_BUS + boats * SEATS_PER_BOAT:,} people"
    )


def _stability_module(habitations):
    if not habitations:
        return None, "No habitations loaded"

    values = [
        h["classification_stability"]
        for h in habitations.values()
        if h.get("classification_stability") is not None
    ]
    if not values:
        return None, "Stability check not run"
    mean = sum(values) / len(values)
    return f"{mean * 100:.0f}%", "Mean band stability under weight perturbation"


def _ml_module(habitations):
    """
    Report how many habitations actually received an ML susceptibility shift.

    This deliberately counts real contributions rather than reporting the
    models as "loaded". A model that loads but throws on every prediction is
    not contributing, and a status grid that claims otherwise is worse than no
    status grid.
    """
    if not habitations:
        return None, "No habitations loaded"

    flood = sum(1 for h in habitations.values() if h.get("ml_contribution"))
    landslide = sum(1 for h in habitations.values() if h.get("ml_contribution_landslide"))
    total = len(habitations)

    if flood == 0 and landslide == 0:
        return None, "No ML contribution applied"
    return f"{flood}F / {landslide}L", f"of {total} habitations received an ML shift"


def build_modules(*, habitations, sites, routes, current_plan, pending_plan,
                  plan_history, audit_log, health):
    """
    Assemble the module overview.

    Returns a list of card dicts. `status_value` of None means the frontend
    should render an em dash: the module exists but has nothing real to report.
    """
    definitions = [
        {
            "id": "optimizer",
            "name": "CP-SAT Optimizer",
            "description": "Constraint solver assigning every resident to a shelter under capacity, supply and access limits.",
            "icon": "cpu",
            "route": "/dashboard",
            "probe": lambda: _optimizer_module(current_plan),
        },
        {
            "id": "hazard",
            "name": "Hazard Derivation",
            "description": "Flood and landslide exposure computed from elevation and hydrography, with per-signal provenance.",
            "icon": "waves",
            "route": "/dashboard",
            "probe": lambda: _hazard_module(habitations),
        },
        {
            "id": "routing",
            "name": "Road Network Routing",
            "description": "Shortest paths over the real OSM road graph, with a distinct alternative road per redundant route.",
            "icon": "route",
            "route": "/dashboard",
            "probe": lambda: _routing_module(routes),
        },
        {
            "id": "plan-health",
            "name": "Plan Health",
            "description": "Live diagnosis of unmet demand, with concrete interventions that can be applied and re-solved.",
            "icon": "activity",
            "route": "/plan-health",
            "probe": lambda: _plan_health_module(health),
        },
        {
            "id": "approval",
            "name": "Human Approval",
            "description": "No plan reaches the field without a district officer approving it. Every version is retained.",
            "icon": "shield-check",
            "route": "/dashboard",
            "probe": lambda: _approval_module(pending_plan, plan_history),
        },
        {
            "id": "what-if",
            "name": "What-If Sandbox",
            "description": "Vary population or hazard and re-solve without touching the live plan.",
            "icon": "flask-conical",
            "route": "/what-if",
            "probe": lambda: _what_if_module(habitations),
        },
        {
            "id": "audit",
            "name": "Audit Log",
            "description": "Append-only record of every event, intervention, approval and rejection.",
            "icon": "scroll-text",
            "route": "/audit-log",
            "probe": lambda: _audit_module(audit_log),
        },
        {
            "id": "field-reports",
            "name": "Field Reports",
            "description": "Ground observations from field officers, fed straight into re-planning.",
            "icon": "radio",
            "route": "/field-report",
            "probe": lambda: _field_report_module(audit_log),
        },
        {
            "id": "fleet",
            "name": "Transport Fleet",
            "description": "Bus and boat requirements per movement, split by each habitation's road-transit fraction.",
            "icon": "bus",
            "route": "/dashboard",
            "probe": lambda: _fleet_module(current_plan),
        },
        {
            "id": "stability",
            "name": "Classification Stability",
            "description": "How often each red-zone band survives a randomised perturbation of the risk weights.",
            "icon": "target",
            "route": "/dashboard",
            "probe": lambda: _stability_module(habitations),
        },
        {
            "id": "ml",
            "name": "ML Susceptibility",
            "description": "Learned flood and landslide susceptibility blended into the derived exposure scores.",
            "icon": "brain",
            "route": "/dashboard",
            "probe": lambda: _ml_module(habitations),
        },
    ]

    modules = []
    for definition in definitions:
        value, label = _safe(definition["probe"], default=(None, "Status unavailable"))
        modules.append(
            {
                "id": definition["id"],
                "name": definition["name"],
                "description": definition["description"],
                "icon": definition["icon"],
                "route": definition["route"],
                "status_value": value,
                "status_label": label,
                "available": value is not None,
            }
        )
    return modules
