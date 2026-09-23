"""
Road-routing logic.

These tests run against the synthetic fixture graph in conftest, not against
real OSM data. What they verify is that the code does the right thing with a
graph: picks the genuinely shortest path, finds a genuinely distinct second
path, accumulates length and time correctly, emits Leaflet-ready geometry, and
maps redundant CSV routes onto distinct roads instead of duplicating one.

Whether the real Barpeta graph produces sensible numbers is a data question,
answered by running geo.fetch_roads and geo.derive_routes --compare. It is not
something a unit test can or should assert.
"""

import pytest

from geo.routing import (
    RoadGraphUnavailable,
    derive_routes,
    k_shortest_paths,
    nearest_node,
    path_geometry,
    path_metrics,
    road_graph_available,
)

HABITATIONS = {"BRP-X": {"lat": 26.300, "lon": 91.000}}
SITES = {"SHL-X": {"lat": 26.300, "lon": 91.015}}


class TestNearestNode:
    def test_snaps_to_the_closest_node(self, fixture_road_graph):
        assert nearest_node(fixture_road_graph, 26.300, 91.000) == "H"
        assert nearest_node(fixture_road_graph, 26.300, 91.015) == "S"

    def test_snaps_an_offset_point(self, fixture_road_graph):
        """A point near but not on a node still resolves to that node."""
        assert nearest_node(fixture_road_graph, 26.3051, 91.0049) == "A"


class TestShortestPaths:
    def test_finds_the_shorter_route_first(self, fixture_road_graph):
        paths = k_shortest_paths(fixture_road_graph, "H", "S", 2)
        assert paths[0] == ["H", "A", "S"]

    def test_finds_a_distinct_alternative(self, fixture_road_graph):
        paths = k_shortest_paths(fixture_road_graph, "H", "S", 2)
        assert len(paths) == 2
        assert paths[1] == ["H", "B", "S"]
        assert paths[0] != paths[1]

    def test_returns_empty_when_unreachable(self, fixture_road_graph):
        fixture_road_graph.add_node("ISLAND", x=92.0, y=27.0)
        assert k_shortest_paths(fixture_road_graph, "H", "ISLAND", 1) == []


class TestPathMetrics:
    def test_length_sums_along_the_path(self, fixture_road_graph):
        distance_km, _ = path_metrics(fixture_road_graph, ["H", "A", "S"])
        assert distance_km == pytest.approx(2.0)

    def test_travel_time_matches_edge_speeds(self, fixture_road_graph):
        """2000 m at 30 km/h is 4 minutes."""
        _, travel_time_min = path_metrics(fixture_road_graph, ["H", "A", "S"])
        assert travel_time_min == pytest.approx(4.0, abs=0.01)

    def test_detour_is_longer_than_direct(self, fixture_road_graph):
        direct, _ = path_metrics(fixture_road_graph, ["H", "A", "S"])
        detour, _ = path_metrics(fixture_road_graph, ["H", "B", "S"])
        assert detour > direct

    def test_missing_edge_raises(self, fixture_road_graph):
        with pytest.raises(ValueError):
            path_metrics(fixture_road_graph, ["A", "B"])


class TestGeometry:
    def test_geometry_is_lat_lon_pairs(self, fixture_road_graph):
        geometry = path_geometry(fixture_road_graph, ["H", "A", "S"])
        assert len(geometry) == 3
        assert all(len(point) == 2 for point in geometry)

    def test_geometry_starts_and_ends_at_the_endpoints(self, fixture_road_graph):
        geometry = path_geometry(fixture_road_graph, ["H", "A", "S"])
        assert geometry[0] == [26.300, 91.000]
        assert geometry[-1] == [26.300, 91.015]

    def test_geometry_is_not_a_straight_chord(self, fixture_road_graph):
        """The middle vertex must not sit on the line between the endpoints."""
        geometry = path_geometry(fixture_road_graph, ["H", "A", "S"])
        start, middle, end = geometry
        expected_lat = start[0] + (end[0] - start[0]) * (
            (middle[1] - start[1]) / (end[1] - start[1])
        )
        assert middle[0] != pytest.approx(expected_lat, abs=1e-6)


class TestRedundancyPreservation:
    def test_redundant_routes_get_distinct_roads(self, fixture_road_graph):
        """
        Two CSV routes for the same pair must map onto two different roads -
        the whole point of route redundancy is that closing one leaves another.
        """
        routes = {
            "R01": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
            "R01B": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
        }
        derived = derive_routes(fixture_road_graph, HABITATIONS, SITES, routes)

        assert derived["R01"]["source"] == "osm_road_network"
        assert derived["R01B"]["source"] == "osm_road_network"
        assert derived["R01"]["geometry"] != derived["R01B"]["geometry"]

    def test_primary_route_is_the_shortest(self, fixture_road_graph):
        routes = {
            "R01": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
            "R01B": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
        }
        derived = derive_routes(fixture_road_graph, HABITATIONS, SITES, routes)

        assert derived["R01"]["is_primary"] is True
        assert derived["R01B"]["is_primary"] is False
        assert derived["R01"]["distance_km"] < derived["R01B"]["distance_km"]

    def test_every_route_id_survives_derivation(self, fixture_road_graph):
        """No route may be silently dropped, whatever the graph looks like."""
        routes = {
            "R01": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
            "R01B": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"},
            "R99": {"from_habitation_id": "BRP-MISSING", "to_site_id": "SHL-X"},
        }
        derived = derive_routes(fixture_road_graph, HABITATIONS, SITES, routes)
        assert set(derived) == set(routes)

    def test_surplus_routes_fall_back_rather_than_duplicate(self, fixture_road_graph):
        """
        Asking for more alternatives than the graph holds must flag the surplus,
        not reuse a path already assigned to another route_id.
        """
        routes = {
            f"R{index}": {"from_habitation_id": "BRP-X", "to_site_id": "SHL-X"}
            for index in range(1, 6)
        }
        derived = derive_routes(fixture_road_graph, HABITATIONS, SITES, routes)

        geometries = [
            tuple(map(tuple, entry["geometry"]))
            for entry in derived.values()
            if entry["source"] == "osm_road_network"
        ]
        assert len(geometries) == len(set(geometries))

        fallbacks = [e for e in derived.values() if e["source"] == "csv_fallback"]
        assert all("reason" in entry for entry in fallbacks)

    def test_unknown_endpoint_is_flagged_not_crashed(self, fixture_road_graph):
        routes = {"R99": {"from_habitation_id": "NOPE", "to_site_id": "SHL-X"}}
        derived = derive_routes(fixture_road_graph, HABITATIONS, SITES, routes)
        assert derived["R99"]["source"] == "csv_fallback"
        assert "unknown endpoint" in derived["R99"]["reason"]


class TestGraphAvailability:
    def test_missing_cache_raises_a_clear_error(self):
        """
        When no graph is cached, loading must fail loudly with an actionable
        message rather than returning an empty graph that silently routes
        nobody anywhere.
        """
        if road_graph_available():
            pytest.skip("a road graph is cached on this machine")

        from geo.routing import load_road_graph

        with pytest.raises(RoadGraphUnavailable) as excinfo:
            load_road_graph()
        assert "geo.fetch_roads" in str(excinfo.value)
