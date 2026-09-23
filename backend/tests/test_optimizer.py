"""
Optimizer invariants.

These are the properties a relocation plan must hold regardless of what the
input data happens to be: nobody is invented, nobody is lost, no shelter is
over-filled, and critical-care people never land somewhere without healthcare.
"""

import copy

import pytest

from event_simulator import trigger_bridge_collapse
from optimizer import build_and_solve, greedy_fallback


class TestBaselineSolve:
    def test_baseline_reaches_optimal(self, world):
        """The baseline dataset is small enough that CP-SAT should prove optimality."""
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)
        assert result["status"] == "OPTIMAL", f"got {result['status']}"

    def test_baseline_produces_assignments(self, world):
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)
        assert len(result["assignments"]) > 0

    def test_objective_is_reported(self, world):
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)
        assert result["objective"] is not None
        assert result["objective"] > 0

    def test_optimality_gap_is_zero_when_optimal(self, world):
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)
        assert result["gap"] == pytest.approx(0.0, abs=1e-6)


class TestPopulationConservation:
    def test_assigned_plus_unmet_equals_total(self, world, total_population):
        """Every person is either assigned to a shelter or counted as unmet."""
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        assigned = sum(a["people_count"] for a in result["assignments"])
        unmet = sum(result.get("unmet_demand", {}).values())
        assert assigned + unmet == total_population

    def test_per_habitation_conservation(self, world):
        """Conservation holds habitation by habitation, not just in aggregate."""
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        for habitation_id, habitation in habitations.items():
            assigned = sum(
                a["people_count"]
                for a in result["assignments"]
                if a["habitation_id"] == habitation_id
            )
            unmet = result.get("unmet_demand", {}).get(habitation_id, 0)
            assert assigned + unmet == habitation["population"], habitation_id

    def test_no_negative_assignment(self, world):
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)
        assert all(a["people_count"] > 0 for a in result["assignments"])


class TestCapacityConstraints:
    def test_no_site_exceeds_effective_capacity(self, world):
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        used = {}
        for assignment in result["assignments"]:
            used[assignment["site_id"]] = (
                used.get(assignment["site_id"], 0) + assignment["people_count"]
            )

        for site_id, occupancy in used.items():
            assert occupancy <= sites[site_id]["effective_capacity"], site_id

    def test_food_supply_constraint_holds(self, world):
        """Three food units per person is a hard constraint, not a preference."""
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        used = {}
        for assignment in result["assignments"]:
            used[assignment["site_id"]] = (
                used.get(assignment["site_id"], 0) + assignment["people_count"]
            )

        for site_id, occupancy in used.items():
            assert occupancy * 3 <= sites[site_id]["food_supply_units"], site_id

    def test_critical_care_never_routed_to_site_without_healthcare(self, world):
        """
        A habitation's flow into non-healthcare sites must leave room for all of
        its critical-care residents at healthcare-equipped sites.
        """
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        for habitation_id, habitation in habitations.items():
            critical = habitation.get("critical_care_population", 0)
            if critical <= 0:
                continue
            into_non_healthcare = sum(
                a["people_count"]
                for a in result["assignments"]
                if a["habitation_id"] == habitation_id
                and not sites[a["site_id"]].get("has_healthcare", True)
            )
            assert into_non_healthcare <= habitation["population"] - critical, habitation_id

    def test_closed_routes_carry_no_flow(self, world):
        habitations, sites, routes = world
        routes = copy.deepcopy(routes)
        routes["R01"]["status"] = "closed"

        result = build_and_solve(habitations, sites, routes)
        assert all(a["route_id"] != "R01" for a in result["assignments"])


class TestGreedyFallback:
    def test_greedy_respects_capacity(self, world):
        habitations, sites, routes = world
        result = greedy_fallback(habitations, sites, routes)

        used = {}
        for assignment in result["assignments"]:
            used[assignment["site_id"]] = (
                used.get(assignment["site_id"], 0) + assignment["people_count"]
            )
        for site_id, occupancy in used.items():
            assert occupancy <= sites[site_id]["effective_capacity"], site_id

    def test_greedy_never_over_assigns_a_habitation(self, world):
        habitations, sites, routes = world
        result = greedy_fallback(habitations, sites, routes)

        for habitation_id, habitation in habitations.items():
            assigned = sum(
                a["people_count"]
                for a in result["assignments"]
                if a["habitation_id"] == habitation_id
            )
            assert assigned <= habitation["population"], habitation_id

    def test_greedy_reports_heuristic_status(self, world):
        habitations, sites, routes = world
        assert greedy_fallback(habitations, sites, routes)["status"] == "HEURISTIC"

    def test_solver_survives_total_route_closure(self, world, total_population):
        """
        With every route closed the model is still feasible - everyone simply
        becomes unmet demand. The solver must say so rather than erroring.
        """
        habitations, sites, routes = world
        routes = copy.deepcopy(routes)
        for route in routes.values():
            route["status"] = "closed"

        result = build_and_solve(habitations, sites, routes)
        assert result["status"] in ("OPTIMAL", "FEASIBLE", "HEURISTIC FALLBACK")
        assigned = sum(a["people_count"] for a in result["assignments"])
        unmet = sum(result.get("unmet_demand", {}).values())
        assert assigned + unmet == total_population

    def test_zero_capacity_everywhere_yields_full_unmet(self, world, total_population):
        """Forced infeasibility of supply: all demand must surface as unmet."""
        habitations, sites, routes = world
        sites = copy.deepcopy(sites)
        for site in sites.values():
            site["effective_capacity"] = 0

        result = build_and_solve(habitations, sites, routes)
        assigned = sum(a["people_count"] for a in result["assignments"])
        assert assigned == 0
        assert sum(result.get("unmet_demand", {}).values()) == total_population


class TestTransportFleet:
    def test_bus_and_boat_counts_cover_everyone(self, world):
        """
        Fleet sizing must never under-provision: buses x 40 plus boats x 15 has
        to carry at least the assigned headcount.
        """
        habitations, sites, routes = world
        result = build_and_solve(habitations, sites, routes)

        for assignment in result["assignments"]:
            seats = assignment["buses_required"] * 40 + assignment["boats_required"] * 15
            assert seats >= assignment["people_count"], assignment


class TestRouteRedundancy:
    """
    Migrated from the loose ``backend/test_redundancy.py`` script, which only
    printed results and asserted nothing.

    BRP-001 has two parallel routes to SHL-001 (R01 primary, R01B alternate)
    plus R02 to SHL-002. Losing one of the parallel routes must not strand
    anyone; losing both is the dual-collapse case.

    These assert invariants, deliberately NOT which shelter the optimizer picks
    for BRP-001 afterwards - that is an optimisation outcome, not a requirement.
    """

    def test_single_collapse_is_absorbed_by_the_alternate_route(self, world):
        """Control case: with R01 down, BRP-001 is still fully served."""
        habitations, sites, routes = world
        baseline = build_and_solve(habitations, sites, routes)

        result = trigger_bridge_collapse("R01", habitations, sites, routes, baseline)

        assert all(a["route_id"] != "R01" for a in result["assignments"])
        assert result.get("unmet_demand", {}).get("BRP-001", 0) == 0

    def test_dual_collapse_leaves_no_flow_on_either_route(self, world):
        """R01 already closed, then R01B collapses: neither may carry anyone."""
        habitations, sites, routes = world
        baseline = build_and_solve(habitations, sites, routes)
        routes["R01"]["status"] = "closed"

        result = trigger_bridge_collapse("R01B", habitations, sites, routes, baseline)

        used = {a["route_id"] for a in result["assignments"]}
        assert not used & {"R01", "R01B"}
        open_routes = {rid for rid, r in routes.items() if r["status"] == "open"}
        assert used <= open_routes

    def test_dual_collapse_conserves_every_person(self, world, total_population):
        """Nobody is lost or invented, habitation by habitation and in total."""
        habitations, sites, routes = world
        baseline = build_and_solve(habitations, sites, routes)
        routes["R01"]["status"] = "closed"

        result = trigger_bridge_collapse("R01B", habitations, sites, routes, baseline)

        unmet_by_hab = result.get("unmet_demand", {})
        for habitation_id, habitation in habitations.items():
            assigned = sum(
                a["people_count"]
                for a in result["assignments"]
                if a["habitation_id"] == habitation_id
            )
            assert assigned + unmet_by_hab.get(habitation_id, 0) == habitation["population"], habitation_id

        assigned_total = sum(a["people_count"] for a in result["assignments"])
        assert assigned_total + sum(unmet_by_hab.values()) == total_population

    def test_dual_collapse_reports_the_triggering_route(self, world):
        habitations, sites, routes = world
        baseline = build_and_solve(habitations, sites, routes)
        routes["R01"]["status"] = "closed"

        result = trigger_bridge_collapse("R01B", habitations, sites, routes, baseline)

        assert "R01B" in result["invalidation_reason"]
