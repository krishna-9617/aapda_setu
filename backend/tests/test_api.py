"""
API surface.

Runs against an in-process TestClient rather than a live server, so the suite
needs no separate uvicorn and no fixed port. The client context manager fires
the startup hook, which is what generates the baseline plan.

Each test resets to a clean baseline first: main.py holds plan state in module
globals, so without a reset the outcome would depend on test ordering.
"""

import pytest
from fastapi.testclient import TestClient

# Updated to match Census 2011 real populations loaded from habitations.csv:
# BRP-001 Ambari=553, BRP-002 Howly=800 (estimated neighbourhood),
# BRP-003 Fulkipara=1381, BRP-004 Baghbar=1225, BRP-005 Kalgachia=6304
# Total: 10263 (verified by golden_demo_path.py)
TOTAL_POPULATION = 10263


@pytest.fixture(scope="module")
def client():
    import main

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture
def fresh(client):
    """A client pointed at a freshly reset baseline plan."""
    response = client.post("/plans/reset")
    assert response.status_code == 200
    return client


class TestHealthAndData:
    def test_root_health_check(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_habitations_endpoint(self, fresh):
        habitations = fresh.get("/habitations").json()
        assert len(habitations) == 5
        assert all("hazard_score" in h for h in habitations.values())

    def test_habitations_carry_score_provenance(self, fresh):
        """Every habitation must say where its hazard score came from."""
        habitations = fresh.get("/habitations").json()
        for habitation in habitations.values():
            assert habitation["hazard_score_source"] in ("derived", "csv", "csv_fallback")

    def test_routes_carry_geometry_provenance(self, fresh):
        routes = fresh.get("/routes").json()
        for route in routes.values():
            assert route["geometry_source"] in (
                "osm_road_network",
                "osrm",
                "ors",
                "straight_line_estimate",
            )


    def test_sites_endpoint(self, fresh):
        sites = fresh.get("/sites").json()
        assert len(sites) == 5
        assert all(s["effective_capacity"] >= 0 for s in sites.values())


class TestBaselinePlan:
    def test_baseline_is_optimal(self, fresh):
        plan = fresh.get("/plans/current").json()
        assert plan["solver_status"] == "OPTIMAL"

    def test_baseline_conserves_population(self, fresh):
        plan = fresh.get("/plans/current").json()
        assigned = sum(a["people_count"] for a in plan["assignments"])
        unmet = sum(plan.get("unmet_demand", {}).values())
        assert assigned + unmet == TOTAL_POPULATION

    def test_baseline_respects_capacity(self, fresh):
        plan = fresh.get("/plans/current").json()
        sites = fresh.get("/sites").json()

        used = {}
        for assignment in plan["assignments"]:
            used[assignment["site_id"]] = (
                used.get(assignment["site_id"], 0) + assignment["people_count"]
            )
        for site_id, occupancy in used.items():
            assert occupancy <= sites[site_id]["effective_capacity"], site_id

    def test_optimize_is_idempotent(self, fresh):
        """Re-optimizing clean data must reproduce the same objective."""
        first = fresh.post("/plans/optimize").json()
        second = fresh.post("/plans/optimize").json()
        assert first["objective"] == second["objective"]


class TestSystemModules:
    def test_modules_endpoint_responds(self, fresh):
        response = fresh.get("/system/modules")
        assert response.status_code == 200
        assert response.json()["module_count"] > 0

    def test_every_module_has_the_required_card_fields(self, fresh):
        for module in fresh.get("/system/modules").json()["modules"]:
            for field in ("id", "name", "description", "icon", "route",
                          "status_value", "status_label", "available"):
                assert field in module, f"{module.get('id')} missing {field}"

    def test_available_flag_matches_status_value(self, fresh):
        """`available` must never claim a value the module does not have."""
        for module in fresh.get("/system/modules").json()["modules"]:
            assert module["available"] == (module["status_value"] is not None)

    def test_optimizer_module_reports_the_real_solver_status(self, fresh):
        plan = fresh.get("/plans/current").json()
        modules = {m["id"]: m for m in fresh.get("/system/modules").json()["modules"]}
        assert modules["optimizer"]["status_value"] == plan["solver_status"]

    def test_status_values_track_state_changes(self, fresh):
        """
        The grid must be live, not a snapshot. Submitting a field report has to
        move the field-report count.
        """
        modules = {m["id"]: m for m in fresh.get("/system/modules").json()["modules"]}
        assert modules["field-reports"]["status_value"] is None

        fresh.post(
            "/field-reports/hazard-incident",
            json={"incident_type": "capacity_drop", "target_id": "SHL-005"},
        )

        modules = {m["id"]: m for m in fresh.get("/system/modules").json()["modules"]}
        assert modules["field-reports"]["status_value"] == "1"

    def test_module_routes_are_frontend_paths(self, fresh):
        for module in fresh.get("/system/modules").json()["modules"]:
            assert module["route"].startswith("/")


class TestEvents:
    def test_bridge_collapse_reroutes(self, fresh):
        response = fresh.post("/events/bridge-collapse", json={"route_id": "R01"})
        assert response.status_code == 200
        body = response.json()
        assert body["solver_status"] in ("OPTIMAL", "FEASIBLE")
        assert all(a["route_id"] != "R01" for a in body["plan"]["assignments"])

    def test_bridge_collapse_conserves_population(self, fresh):
        body = fresh.post("/events/bridge-collapse", json={"route_id": "R01"}).json()
        plan = body["plan"]
        assigned = sum(a["people_count"] for a in plan["assignments"])
        unmet = sum(plan.get("unmet_demand", {}).values())
        assert assigned + unmet == TOTAL_POPULATION

    def test_capacity_drop_reduces_effective_capacity(self, fresh):
        before = fresh.get("/sites").json()["SHL-005"]["effective_capacity"]
        response = fresh.post(
            "/events/capacity-drop", json={"site_id": "SHL-005", "drop_percent": 0.5}
        )
        assert response.status_code == 200

        plan_id = response.json()["new_plan_id"]
        fresh.post(f"/plans/{plan_id}/approve")
        after = fresh.get("/sites").json()["SHL-005"]["effective_capacity"]
        assert after < before

    def test_rainfall_event_raises_hazard_scores(self, fresh):
        response = fresh.post("/events/rainfall", json={"intensity": 0.9})
        assert response.status_code == 200
        assert "invalidation_reason" in response.json()

    def test_events_do_not_mutate_the_live_plan_before_approval(self, fresh):
        """Deepcopy isolation: a pending plan must not leak into current state."""
        before = fresh.get("/plans/current").json()
        fresh.post("/events/bridge-collapse", json={"route_id": "R01"})
        after = fresh.get("/plans/current").json()
        assert before["plan_id"] == after["plan_id"]
        assert before["assignments"] == after["assignments"]

    def test_routes_are_not_mutated_before_approval(self, fresh):
        fresh.post("/events/bridge-collapse", json={"route_id": "R01"})
        assert fresh.get("/routes").json()["R01"]["status"] == "open"


class TestApprovalWorkflow:
    def test_approve_promotes_the_pending_plan(self, fresh):
        body = fresh.post("/events/bridge-collapse", json={"route_id": "R01"}).json()
        plan_id = body["new_plan_id"]

        response = fresh.post(f"/plans/{plan_id}/approve")
        assert response.status_code == 200
        assert fresh.get("/plans/current").json()["plan_id"] == plan_id
        assert fresh.get("/routes").json()["R01"]["status"] == "closed"

    def test_reject_discards_the_pending_plan(self, fresh):
        before = fresh.get("/plans/current").json()["plan_id"]
        body = fresh.post("/events/bridge-collapse", json={"route_id": "R01"}).json()

        response = fresh.post(f"/plans/{body['new_plan_id']}/reject")
        assert response.status_code == 200
        assert fresh.get("/plans/current").json()["plan_id"] == before
        assert fresh.get("/plans/pending").json() is None

    def test_approving_an_unknown_plan_is_404(self, fresh):
        assert fresh.post("/plans/not-a-real-id/approve").status_code == 404

    def test_approval_is_recorded_in_the_audit_log(self, fresh):
        body = fresh.post("/events/bridge-collapse", json={"route_id": "R01"}).json()
        fresh.post(f"/plans/{body['new_plan_id']}/approve")

        actions = [entry["action_type"] for entry in fresh.get("/audit-log").json()]
        assert "plan_approved" in actions

    def test_plan_history_records_versions(self, fresh):
        body = fresh.post("/events/bridge-collapse", json={"route_id": "R01"}).json()
        fresh.post(f"/plans/{body['new_plan_id']}/approve")

        history = fresh.get("/plans/history").json()
        assert len(history) >= 2


class TestValidation:
    def test_unknown_route_id_is_400(self, fresh):
        response = fresh.post("/events/bridge-collapse", json={"route_id": "R99"})
        assert response.status_code == 400
        assert "R99" in response.json()["detail"]

    def test_unknown_site_id_is_400(self, fresh):
        response = fresh.post("/events/capacity-drop", json={"site_id": "SHL-999"})
        assert response.status_code == 400

    def test_missing_required_field_is_400(self, fresh):
        """Pydantic rejects a malformed body before any handler code runs."""
        response = fresh.post("/events/bridge-collapse", json={})
        assert response.status_code == 400
        assert "route_id" in response.json()["detail"]

    def test_wrong_type_is_400(self, fresh):
        response = fresh.post(
            "/events/capacity-drop",
            json={"site_id": "SHL-005", "drop_percent": "half"},
        )
        assert response.status_code == 400

    def test_validation_errors_use_the_same_body_shape_as_domain_errors(self, fresh):
        """
        Both kinds of rejection must expose `detail` as a string, so the
        frontend has exactly one error contract to handle.
        """
        schema_error = fresh.post("/events/bridge-collapse", json={}).json()
        domain_error = fresh.post("/events/bridge-collapse", json={"route_id": "R99"}).json()
        assert isinstance(schema_error["detail"], str)
        assert isinstance(domain_error["detail"], str)

    def test_out_of_range_capacity_drop_is_rejected(self, fresh):
        response = fresh.post(
            "/events/capacity-drop", json={"site_id": "SHL-005", "drop_percent": 2.5}
        )
        assert response.status_code == 400

    def test_negative_intervention_amount_is_rejected(self, fresh):
        response = fresh.post(
            "/plans/apply-intervention",
            json={"type": "increase_capacity", "site_id": "SHL-001",
                  "resource_type": "capacity_water", "amount": -500},
        )
        assert response.status_code == 400

    def test_out_of_range_rainfall_is_400(self, fresh):
        response = fresh.post("/events/rainfall", json={"intensity": 5.0})
        assert response.status_code == 400
        assert isinstance(response.json()["detail"], str)

    def test_unknown_intervention_type_is_400(self, fresh):
        response = fresh.post(
            "/plans/apply-intervention", json={"type": "teleport", "site_id": "SHL-001"}
        )
        assert response.status_code == 400

    def test_unknown_incident_type_is_400(self, fresh):
        response = fresh.post(
            "/field-reports/hazard-incident",
            json={"incident_type": "meteor", "target_id": "SHL-001"},
        )
        assert response.status_code == 400

    def test_no_endpoint_returns_an_unhandled_500(self, fresh):
        """Malformed input must surface as 4xx, never as a stack trace."""
        bad_requests = [
            ("/events/bridge-collapse", {"route_id": ""}),
            ("/events/capacity-drop", {"site_id": "", "drop_percent": -1}),
            ("/plans/simulate", {"population_multiplier": -5}),
        ]
        for path, payload in bad_requests:
            assert fresh.post(path, json=payload).status_code < 500, path


class TestWhatIf:
    def test_simulation_returns_a_solved_scenario(self, fresh):
        response = fresh.post("/plans/simulate", json={"population_multiplier": 1.5})
        assert response.status_code == 200
        assert response.json()["solver_status"] in ("OPTIMAL", "FEASIBLE")

    def test_simulation_does_not_touch_the_live_plan(self, fresh):
        before = fresh.get("/plans/current").json()
        fresh.post("/plans/simulate", json={"population_multiplier": 3.0})
        assert fresh.get("/plans/current").json()["assignments"] == before["assignments"]

    def test_larger_population_cannot_reduce_unmet_demand(self, fresh):
        baseline = sum(fresh.get("/plans/current").json().get("unmet_demand", {}).values())
        scaled = fresh.post("/plans/simulate", json={"population_multiplier": 2.0}).json()
        assert scaled["total_unmet_demand"] >= baseline

    def test_simulation_includes_plan_health(self, fresh):
        body = fresh.post("/plans/simulate", json={"population_multiplier": 2.0}).json()
        assert "status" in body["health"]


class TestPlanHealth:
    def test_health_endpoint_responds(self, fresh):
        body = fresh.get("/plans/health").json()
        assert body["status"] in ("HEALTHY", "AT RISK", "UNKNOWN")

    def test_interventions_are_actionable(self, fresh):
        """Every suggested intervention must carry the fields needed to apply it."""
        for intervention in fresh.get("/plans/health").json()["interventions"]:
            assert intervention["type"] in ("increase_capacity", "open_route")
            assert intervention["title"]
            if intervention["type"] == "increase_capacity":
                assert intervention["site_id"] and intervention["resource_type"]
            else:
                assert intervention["habitation_id"] and intervention["site_id"]

    def test_applying_an_intervention_produces_a_pending_plan(self, fresh):
        interventions = fresh.get("/plans/health").json()["interventions"]
        if not interventions:
            pytest.skip("baseline plan is healthy; no intervention to apply")

        response = fresh.post("/plans/apply-intervention", json=interventions[0])
        assert response.status_code == 200
        assert fresh.get("/plans/pending").json() is not None


class TestComparison:
    def test_cpsat_beats_naive_on_over_capacity(self, fresh):
        """
        The headline claim of the system is that constrained optimisation beats
        nearest-shelter assignment. That must hold, not just be asserted.
        """
        body = fresh.get("/plans/comparison").json()
        assert body["cpsat"]["over_capacity_count"] <= body["naive"]["over_capacity_count"]

    def test_cpsat_leaves_no_more_unmet_demand_than_naive(self, fresh):
        body = fresh.get("/plans/comparison").json()
        assert body["cpsat"]["unmet_demand"] <= body["naive"]["unmet_demand"]
