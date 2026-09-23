"""
Shared fixtures for the Aapda Setu test suite.

Run from the backend directory:

    python -m pytest tests -v
"""

import os
import sys
import warnings

import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# The bundled .pkl models were fitted under a different scikit-learn build and
# emit version warnings on load. They are noise here, not signal.
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*InconsistentVersion.*")

DATA_DIR = os.path.join(BACKEND_DIR, "data")


@pytest.fixture(scope="session")
def data_dir():
    """Path to the CSV/artifact data directory."""
    return DATA_DIR


@pytest.fixture
def world(data_dir):
    """
    A freshly loaded (habitations, sites, routes) triple.

    Function-scoped on purpose: several tests mutate capacities or route status
    to force a particular solver path, and must not leak that into the next test.
    """
    from data_loader import load_data

    return load_data(data_dir)


@pytest.fixture
def total_population(world):
    """Sum of every habitation's population, the conservation invariant."""
    habitations, _, _ = world
    return sum(h["population"] for h in habitations.values())


@pytest.fixture
def fixture_road_graph():
    """
    A small synthetic road graph used to exercise the routing logic.

    THIS IS A TEST FIXTURE, NOT GEOGRAPHY. The coordinates are arbitrary and
    the edges are invented. It exists to verify that k-shortest-path
    extraction, length/time accumulation and geometry emission behave
    correctly; it says nothing about any real road in Barpeta.

    Layout - two genuinely distinct routes from H to S:

        H --1000m-- A --1000m-- S     (direct, 2000 m total)
        H --1500m-- B --1500m-- S     (detour, 3000 m total)
    """
    import networkx as nx

    graph = nx.MultiDiGraph()
    graph.add_node("H", x=91.000, y=26.300)
    graph.add_node("A", x=91.005, y=26.305)
    graph.add_node("B", x=91.010, y=26.290)
    graph.add_node("S", x=91.015, y=26.300)

    def add_two_way(source, target, length_m, speed_kph):
        travel_time_s = length_m / (speed_kph * 1000 / 3600)
        graph.add_edge(source, target, length=length_m, travel_time=travel_time_s)
        graph.add_edge(target, source, length=length_m, travel_time=travel_time_s)

    add_two_way("H", "A", 1000.0, 30)
    add_two_way("A", "S", 1000.0, 30)
    add_two_way("H", "B", 1500.0, 30)
    add_two_way("B", "S", 1500.0, 30)

    return graph
