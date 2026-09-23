"""
One-time derivation of real road routes from the cached OSM road graph.

    python -m geo.derive_routes            # derive and write the artifact
    python -m geo.derive_routes --compare  # also print straight-line vs road

Writes backend/data/derived_routes.json. data_loader.py merges it into the
routes dict at load time; if the file is absent, routes keep their CSV
estimates and every route is flagged `csv_fallback` so the UI can say so.

Provider order (tried in sequence; first success wins for a given pair):
  1. ORS  — if ORS_API_KEY env var is set (free, no credit card)
  2. OSRM — public demo server (no key required)
  3. OSM graph (routing.py) — local cached road graph; requires fetch_roads
  4. csv_fallback — straight-line estimates from routes.csv

For pairs with multiple routes (e.g. R01 + R01B: BRP-001 -> SHL-001), the
primary route gets the best API result; alternates fall through to the OSM
graph for a genuinely distinct second path, preserving route redundancy.

Run `python -m geo.fetch_roads` to populate the graph cache (needed for
the OSM graph fallback and for pairs with no API result).
"""

import argparse
import datetime
import json
import logging
import os

import pandas as pd

from geo.providers import try_ors, try_osrm
from geo.region import DATA_DIR, DERIVED_ROUTES_PATH, DISTRICT_NAME, DISTRICT_STATE
from geo.routing import RoadGraphUnavailable, derive_routes, load_road_graph

logger = logging.getLogger(__name__)


def load_endpoints():
    """Read habitation and site coordinates plus the route table from CSV."""
    habitations_df = pd.read_csv(DATA_DIR / "habitations.csv")
    sites_df = pd.read_csv(DATA_DIR / "sites.csv")
    routes_df = pd.read_csv(DATA_DIR / "routes.csv")

    habitations = {
        row["habitation_id"]: {"lat": float(row["lat"]), "lon": float(row["lon"])}
        for _, row in habitations_df.iterrows()
    }
    sites = {
        row["site_id"]: {"lat": float(row["lat"]), "lon": float(row["lon"])}
        for _, row in sites_df.iterrows()
    }
    routes = {
        row["route_id"]: {
            "from_habitation_id": row["from_habitation_id"],
            "to_site_id": row["to_site_id"],
            "distance_km": float(row["distance_km"]),
            "travel_time_min": float(row["travel_time_min"]),
        }
        for _, row in routes_df.iterrows()
    }
    return habitations, sites, routes


def _api_route_for_pair(habitation, site, first_request):
    """
    Try ORS then OSRM for a single (habitation, site) pair.

    Returns (source, entry) where source is 'ors'/'osrm' or None on failure.
    first_request: True for the very first call (skip OSRM delay on first).
    """
    ors_key_set = bool(os.environ.get("ORS_API_KEY"))

    if ors_key_set:
        result = try_ors(
            habitation["lat"], habitation["lon"],
            site["lat"], site["lon"],
        )
        if result is not None:
            logger.info("ORS: got route (%.2f km)", result["distance_km"])
            return "ors", result
        logger.warning("ORS failed for this pair; trying OSRM")

    # OSRM — skip the inter-request delay on the very first call
    result = try_osrm(
        habitation["lat"], habitation["lon"],
        site["lat"], site["lon"],
        delay=not first_request,
    )
    if result is not None:
        logger.info("OSRM: got route (%.2f km)", result["distance_km"])
        return "osrm", result

    logger.warning("OSRM also failed; will fall back to OSM graph or csv_fallback")
    return None, None


def build_artifact():
    """Run the derivation and return the artifact dict."""
    habitations, sites, routes = load_endpoints()

    ors_key_set = bool(os.environ.get("ORS_API_KEY"))
    logger.info(
        "Provider order: %s -> OSRM -> OSM graph -> csv_fallback",
        "ORS" if ors_key_set else "ORS (SKIPPED, ORS_API_KEY not set)",
    )

    # Group route_ids by the (habitation, site) pair they serve, preserving
    # CSV order so the primary route (R01) gets the best available path and
    # the alternate (R01B) gets a genuinely distinct second path.
    by_pair = {}
    for route_id, route in routes.items():
        pair = (route["from_habitation_id"], route["to_site_id"])
        by_pair.setdefault(pair, []).append(route_id)

    # ── Phase 1: try API providers for the PRIMARY route of each pair ────────
    # We only call the API once per unique pair (the primary route). If the pair
    # has a redundant route (R01B), that one uses the OSM graph for a distinct path.
    api_results = {}   # pair -> (source, entry) or (None, None)
    first_request = True
    for pair, route_ids in by_pair.items():
        hab_id, site_id = pair
        habitation = habitations.get(hab_id)
        site = sites.get(site_id)
        if habitation is None or site is None:
            api_results[pair] = (None, None)
            continue

        source, entry = _api_route_for_pair(habitation, site, first_request)
        api_results[pair] = (source, entry)
        first_request = False

    # ── Phase 2: OSM graph for pairs that need a 2nd path or had no API result ─
    # Load the graph only if needed. It may be unavailable (fetch_roads not run).
    graph = None
    graph_available = False
    graph_nodes = 0
    graph_edges = 0

    needs_graph = any(
        len(route_ids) > 1 or api_results[pair][0] is None
        for pair, route_ids in by_pair.items()
    )
    if needs_graph:
        try:
            graph = load_road_graph()
            graph_available = True
            graph_nodes = graph.number_of_nodes()
            graph_edges = graph.number_of_edges()
            logger.info("Road graph loaded: %d nodes, %d edges", graph_nodes, graph_edges)
        except RoadGraphUnavailable as exc:
            logger.warning("OSM road graph unavailable: %s", exc)

    # ── Phase 3: assemble the per-route entries ──────────────────────────────
    derived = {}
    osm_graph_derived = {}  # result from routing.py if graph available

    if graph is not None:
        osm_graph_derived = derive_routes(graph, habitations, sites, routes)

    for pair, route_ids in by_pair.items():
        api_source, api_entry = api_results[pair]
        hab_id, site_id = pair

        for index, route_id in enumerate(route_ids):
            csv_ref = {
                "distance_km": routes[route_id]["distance_km"],
                "travel_time_min": routes[route_id]["travel_time_min"],
            }

            if index == 0 and api_entry is not None:
                # Primary route: use the API result
                entry = dict(api_entry)
                entry["csv_reference"] = csv_ref
                derived[route_id] = entry

            elif graph is not None and osm_graph_derived.get(route_id, {}).get("source") == "osm_road_network":
                # Alternate (or primary where API failed): use OSM graph path
                entry = dict(osm_graph_derived[route_id])
                entry["csv_reference"] = csv_ref
                derived[route_id] = entry

            else:
                # No API result, no graph, or graph also failed
                reason = osm_graph_derived.get(route_id, {}).get("reason", "No road graph or API result available")
                if index > 0 and api_entry is not None:
                    reason = (
                        f"Primary route used {api_source} API; "
                        f"distinct alternate path requires OSM graph (not available)"
                    )
                derived[route_id] = {
                    "source": "csv_fallback",
                    "reason": reason,
                    "csv_reference": csv_ref,
                }

    # ── Counts by source ─────────────────────────────────────────────────────
    source_counts = {}
    for entry in derived.values():
        s = entry.get("source", "csv_fallback")
        source_counts[s] = source_counts.get(s, 0) + 1

    return {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "district": f"{DISTRICT_NAME}, {DISTRICT_STATE}",
        "road_graph_available": graph_available,
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
        "ors_available": ors_key_set,
        "source_counts": source_counts,
        "routes": derived,
    }


def print_comparison(artifact):
    """Print straight-line CSV estimates against derived road distances."""
    header = (
        f"{'route':<12}{'old_km':>9}{'new_km':>9}{'ratio':>8}"
        f"{'old_min':>9}{'new_min':>9}{'pts':>6}  {'source':<18}"
    )
    print(header)
    print("-" * len(header))

    for route_id, entry in artifact["routes"].items():
        reference = entry.get("csv_reference", {})
        old_km = reference.get("distance_km")
        source = entry.get("source", "csv_fallback")
        if source == "csv_fallback":
            print(
                f"{route_id:<12}{old_km if old_km is None else f'{old_km:.2f}':>9}"
                f"{'-':>9}{'-':>8}{'-':>9}{'-':>9}{'-':>6}  {'csv_fallback':<18}"
            )
            continue

        new_km = entry.get("distance_km", 0)
        new_min = entry.get("travel_time_min")
        ratio = new_km / old_km if old_km else float("nan")
        node_count = entry.get("node_count", 0)
        print(
            f"{route_id:<12}{old_km:>9.2f}{new_km:>9.2f}{ratio:>8.2f}"
            f"{reference.get('travel_time_min', 0):>9.1f}"
            f"{(0 if new_min is None else new_min):>9.1f}"
            f"{node_count:>6}  {source:<18}"
        )


def main():
    parser = argparse.ArgumentParser(description="Derive road routes via ORS/OSRM/OSM graph")
    parser.add_argument("--compare", action="store_true", help="print straight-line vs road")
    parser.add_argument("--dry-run", action="store_true", help="do not write the artifact")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    artifact = build_artifact()

    if not args.dry_run:
        DERIVED_ROUTES_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
        logger.info("Wrote %s", DERIVED_ROUTES_PATH)

    print()
    print(f"District:            {artifact['district']}")
    print(f"Road graph available: {artifact['road_graph_available']}")
    print(f"ORS available:        {artifact['ors_available']}")
    print(f"Source counts:        {artifact['source_counts']}")
    print()

    if args.compare:
        print_comparison(artifact)
        print()

    has_real_routes = any(
        s in artifact.get("source_counts", {})
        for s in ("ors", "osrm", "osm_road_network")
    )
    return 0 if has_real_routes else 1


if __name__ == "__main__":
    raise SystemExit(main())
