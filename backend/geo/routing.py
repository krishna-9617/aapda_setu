"""
Real road-following routes between habitations and shelter sites.

Replaces the straight-line distance_km / travel_time_min estimates in
routes.csv with shortest paths over the cached OSM road graph, and adds a
`geometry` field carrying the actual coordinate path so the map can draw the
road instead of a chord across the floodplain.

PRESERVING ROUTE REDUNDANCY
---------------------------
routes.csv deliberately carries more than one route for some pairs (R01 and
R01B both run BRP-001 -> SHL-001). That redundancy is a real feature: it is
what lets a bridge collapse on one route leave an alternative standing. A
naive "one shortest path per pair" rewrite would silently delete it.

So for a pair with N routes in the CSV, this module extracts the N shortest
*simple* paths from the graph, in ascending length order, and maps them onto
that pair's CSV routes in their existing order. R01 becomes the true shortest
road; R01B becomes the genuinely distinct second-best road. Every route_id
survives, every route now describes a road that exists, and closing one no
longer closes the other by accident.

If the graph has fewer than N distinct simple paths for a pair, the surplus
CSV routes keep their original estimates and are flagged `csv_fallback` rather
than being duplicated or dropped.

Nothing here runs at request time. `python -m geo.derive_routes` writes
data/derived_routes.json; data_loader.py merges it in at load.
"""

import itertools
import logging

from geo.region import ROAD_GRAPH_CACHE

logger = logging.getLogger(__name__)

# Cap on how deep to search for alternative simple paths. Without a cap,
# shortest_simple_paths on a dense urban graph can enumerate for a very long
# time; 25 is far more alternatives than any pair in this dataset needs.
MAX_SIMPLE_PATHS = 25

# Edge attribute names written by osmnx.add_edge_travel_times / add_edge_speeds.
LENGTH_ATTR = "length"
TRAVEL_TIME_ATTR = "travel_time"

SECONDS_PER_MINUTE = 60.0
METRES_PER_KM = 1000.0


class RoadGraphUnavailable(Exception):
    """Raised when routing is requested but no cached road graph exists."""


def road_graph_available():
    """True when a cached road graph exists on disk."""
    return ROAD_GRAPH_CACHE.exists()


def load_road_graph():
    """
    Load the cached road graph.

    Raises RoadGraphUnavailable when there is no cache, so callers fall back to
    the CSV estimates rather than silently producing nothing.
    """
    if not road_graph_available():
        raise RoadGraphUnavailable(
            f"No road graph at {ROAD_GRAPH_CACHE}. Run `python -m geo.fetch_roads` first."
        )
    import osmnx as ox

    return ox.load_graphml(ROAD_GRAPH_CACHE)


def nearest_node(graph, lat, lon):
    """
    Snap a lat/lon to the nearest node in the road graph.

    Uses osmnx's spatial index when the graph carries the CRS metadata osmnx
    needs, and otherwise scans node coordinates directly. The scan path exists
    so the routing logic stays testable against a plain networkx graph without
    the whole osmnx stack in the loop — osmnx raises KeyError('crs') on any
    graph it did not build itself, which is a configuration fact rather than a
    failure worth catching.
    """
    if graph.graph.get("crs"):
        try:
            import osmnx as ox

            return ox.nearest_nodes(graph, X=lon, Y=lat)
        except ImportError:
            logger.debug("osmnx unavailable; falling back to coordinate scan")

    best_node = None
    best_distance = None
    for node, attrs in graph.nodes(data=True):
        if "x" not in attrs or "y" not in attrs:
            continue
        distance = (attrs["x"] - lon) ** 2 + (attrs["y"] - lat) ** 2
        if best_distance is None or distance < best_distance:
            best_distance = distance
            best_node = node
    if best_node is None:
        raise ValueError("Road graph has no nodes with coordinates")
    return best_node


def path_metrics(graph, path):
    """
    Total length (km) and travel time (min) along a node path.

    Handles both MultiDiGraph (osmnx) and plain Graph inputs, taking the
    cheapest parallel edge when several exist between two nodes.
    """
    total_length_m = 0.0
    total_time_s = 0.0

    for source, target in zip(path[:-1], path[1:]):
        edge_data = graph.get_edge_data(source, target)
        if edge_data is None:
            raise ValueError(f"No edge between {source} and {target}")

        # MultiDiGraph gives {key: attrs}; Graph gives attrs directly.
        candidates = (
            list(edge_data.values())
            if all(isinstance(value, dict) for value in edge_data.values())
            else [edge_data]
        )
        best = min(candidates, key=lambda attrs: attrs.get(LENGTH_ATTR, float("inf")))

        length_m = float(best.get(LENGTH_ATTR, 0.0))
        total_length_m += length_m

        if TRAVEL_TIME_ATTR in best:
            total_time_s += float(best[TRAVEL_TIME_ATTR])
        else:
            total_time_s = None if total_time_s is None else total_time_s

    return (
        total_length_m / METRES_PER_KM,
        None if total_time_s is None else total_time_s / SECONDS_PER_MINUTE,
    )


def path_geometry(graph, path):
    """
    Coordinate path as [[lat, lon], ...], ready for a Leaflet Polyline.

    Node coordinates only, not full edge geometry: osmnx stores curved way
    geometry on the edge, but node-level resolution is already a genuine
    road-following path and keeps the payload small enough to ship every route
    in one API response.
    """
    coordinates = []
    for node in path:
        attrs = graph.nodes[node]
        if "y" in attrs and "x" in attrs:
            coordinates.append([float(attrs["y"]), float(attrs["x"])])
    return coordinates


def _simple_digraph(graph):
    """
    Collapse a MultiDiGraph into a DiGraph, keeping the shortest parallel edge.

    networkx.shortest_simple_paths raises NetworkXNotImplemented on multigraphs,
    and osmnx always returns a MultiDiGraph — parallel edges are how OSM
    represents dual carriageways and service loops between the same pair of
    nodes. For choosing a route, only the cheapest of a set of parallel edges
    can ever matter, so collapsing loses nothing.

    Graphs that are already simple are returned untouched.
    """
    import networkx as nx

    if not graph.is_multigraph():
        return graph

    simple = nx.DiGraph() if graph.is_directed() else nx.Graph()
    simple.add_nodes_from(graph.nodes(data=True))
    simple.graph.update(graph.graph)

    for source, target, attrs in graph.edges(data=True):
        length = float(attrs.get(LENGTH_ATTR, float("inf")))
        existing = simple.get_edge_data(source, target)
        if existing is None or length < float(existing.get(LENGTH_ATTR, float("inf"))):
            simple.add_edge(source, target, **attrs)

    return simple


def k_shortest_paths(graph, source, target, k):
    """
    The k shortest simple paths from source to target, by road length.

    Returns a list of node paths, possibly shorter than k if the graph does not
    contain that many distinct simple routes.
    """
    import networkx as nx

    if source == target:
        return [[source]]

    try:
        generator = nx.shortest_simple_paths(
            _simple_digraph(graph), source, target, weight=LENGTH_ATTR
        )
        return list(itertools.islice(generator, min(k, MAX_SIMPLE_PATHS)))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


def derive_routes(graph, habitations, sites, routes):
    """
    Compute real road routes for every route in `routes`.

    habitations / sites: dicts keyed by id, each with lat and lon.
    routes: dict keyed by route_id, each with from_habitation_id and to_site_id.

    Returns a dict keyed by route_id. Each entry either carries the derived
    distance_km, travel_time_min and geometry with source "osm_road_network",
    or carries a reason and source "csv_fallback".
    """
    # Group route_ids by the pair they serve, preserving CSV order so that the
    # primary route in the CSV gets the shortest road.
    by_pair = {}
    for route_id, route in routes.items():
        pair = (route["from_habitation_id"], route["to_site_id"])
        by_pair.setdefault(pair, []).append(route_id)

    derived = {}
    node_cache = {}

    def snap(point_id, lat, lon):
        if point_id not in node_cache:
            node_cache[point_id] = nearest_node(graph, lat, lon)
        return node_cache[point_id]

    for (habitation_id, site_id), route_ids in by_pair.items():
        habitation = habitations.get(habitation_id)
        site = sites.get(site_id)

        if habitation is None or site is None:
            for route_id in route_ids:
                derived[route_id] = {
                    "source": "csv_fallback",
                    "reason": f"unknown endpoint ({habitation_id} -> {site_id})",
                }
            continue

        try:
            source_node = snap(habitation_id, habitation["lat"], habitation["lon"])
            target_node = snap(site_id, site["lat"], site["lon"])
        except ValueError as exc:
            for route_id in route_ids:
                derived[route_id] = {"source": "csv_fallback", "reason": str(exc)}
            continue

        paths = k_shortest_paths(graph, source_node, target_node, len(route_ids))

        for index, route_id in enumerate(route_ids):
            if index >= len(paths):
                derived[route_id] = {
                    "source": "csv_fallback",
                    "reason": (
                        f"road graph offers only {len(paths)} distinct simple "
                        f"path(s) for {habitation_id} -> {site_id}; this "
                        "redundant route keeps its CSV estimate"
                    ),
                }
                continue

            path = paths[index]
            try:
                distance_km, travel_time_min = path_metrics(graph, path)
            except ValueError as exc:
                derived[route_id] = {"source": "csv_fallback", "reason": str(exc)}
                continue

            derived[route_id] = {
                "source": "osm_road_network",
                "distance_km": round(distance_km, 3),
                "travel_time_min": (
                    None if travel_time_min is None else round(travel_time_min, 2)
                ),
                "geometry": path_geometry(graph, path),
                "node_count": len(path),
                "rank": index,
                "is_primary": index == 0,
            }

    return derived
