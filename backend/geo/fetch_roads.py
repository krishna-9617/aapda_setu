"""
One-time fetcher for the drivable road network of the study region.

Run once, offline, ahead of a demo:

    python -m geo.fetch_roads

It writes backend/data/cache/barpeta_roads.graphml. Nothing at request time
ever touches the network or OSMnx — routing.py only reads this cache, and the
API only reads the JSON artifact that routing.py produces. This is deliberate:
a relocation plan must not become un-computable because Overpass is having a
bad day.

Network class: "drive". Evacuation convoys move by bus and truck, so the
pedestrian and cycle networks would add edges no relief vehicle can use.
Boat transit is handled separately through road_transit_fraction, which the
optimizer already applies per habitation.
"""

import logging
import sys

from geo.region import (
    BBOX_EAST,
    BBOX_NORTH,
    BBOX_SOUTH,
    BBOX_WEST,
    ROAD_GRAPH_CACHE,
    ensure_cache_dir,
)

logger = logging.getLogger(__name__)

# OSMnx network type. "drive" keeps only ways a motor vehicle may legally use.
NETWORK_TYPE = "drive"

# Default travel speeds in km/h by OSM highway class, used when a way carries
# no maxspeed tag. These are what a relief convoy realistically sustains on
# rural Assam roads in monsoon conditions, not signposted limits.
FALLBACK_SPEEDS_KPH = {
    "motorway": 60,
    "trunk": 50,
    "primary": 40,
    "secondary": 35,
    "tertiary": 30,
    "unclassified": 20,
    "residential": 20,
    "track": 12,
}

# Speed applied to any way whose class is not in the table above.
DEFAULT_SPEED_KPH = 20


def fetch_and_cache(force=False):
    """
    Download the drivable road network for the study bbox and cache it as
    GraphML, with per-edge travel times already baked in.

    Returns the cache path, or None if OSMnx could not reach Overpass.
    """
    ensure_cache_dir()

    if ROAD_GRAPH_CACHE.exists() and not force:
        logger.info(
            "Road graph cache already present at %s (use --force to refresh)",
            ROAD_GRAPH_CACHE,
        )
        return ROAD_GRAPH_CACHE

    try:
        import osmnx as ox
    except ImportError:
        logger.error("osmnx is not installed. Run: pip install osmnx")
        return None

    try:
        logger.info(
            "Requesting %s network for bbox W=%s S=%s E=%s N=%s",
            NETWORK_TYPE,
            BBOX_WEST,
            BBOX_SOUTH,
            BBOX_EAST,
            BBOX_NORTH,
        )
        graph = ox.graph_from_bbox(
            bbox=(BBOX_WEST, BBOX_SOUTH, BBOX_EAST, BBOX_NORTH),
            network_type=NETWORK_TYPE,
        )
    except Exception as exc:  # osmnx raises a wide variety of transport errors
        logger.error("Road network download failed: %s: %s", type(exc).__name__, exc)
        logger.error(
            "Routes will keep using the straight-line estimates from routes.csv, "
            "flagged as such rather than presented as road distances."
        )
        return None

    graph = ox.add_edge_speeds(graph, hwy_speeds=FALLBACK_SPEEDS_KPH, fallback=DEFAULT_SPEED_KPH)
    graph = ox.add_edge_travel_times(graph)

    ox.save_graphml(graph, ROAD_GRAPH_CACHE)
    logger.info(
        "Cached road graph: %d nodes, %d edges -> %s",
        graph.number_of_nodes(),
        graph.number_of_edges(),
        ROAD_GRAPH_CACHE,
    )
    return ROAD_GRAPH_CACHE


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    path = fetch_and_cache(force="--force" in sys.argv)
    if path is None:
        print("FAILED: could not download the road network from this machine.")
        return 1
    print(f"OK: road graph cached at {path} ({path.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
