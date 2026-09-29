"""
One-time fetcher for the hydrography (waterway) layer used by the flood
exposure signal.

Run once, offline, ahead of a demo:

    python -m geo.fetch_hydrography

It writes a clipped GeoJSON of river / stream centrelines for the study region
to backend/data/cache/barpeta_waterways.geojson. Nothing at request time ever
touches the network — the API only ever reads this cache.

Two sources are attempted, in descending order of spatial fidelity:

  1. OSM Overpass  -- waterway=river|stream|canal ways inside the bbox.
     Resolution: surveyed channel centrelines, typically 10-50 m positional
     accuracy. This is the preferred source.

  2. Natural Earth 10m rivers + lake centrelines (mirrored on GitHub).
     Resolution: 1:10,000,000 cartographic generalisation, so a channel may be
     displaced by 1-3 km from its true position. Usable as a fallback, but the
     derived flood-exposure signal inherits that error and the pipeline records
     the degradation in its provenance block.

Whichever source succeeds is recorded in the GeoJSON's top-level "source"
property so that every downstream number can state where it came from.
"""

import json
import logging
import sys
import urllib.error
import urllib.request

from geo.region import (
    HYDRO_CACHE,
    clipped_bbox,
    ensure_cache_dir,
)

logger = logging.getLogger(__name__)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

NATURAL_EARTH_RIVERS_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_10m_rivers_lake_centerlines.geojson"
)

# Only these OSM waterway classes are treated as flood-relevant channels.
# Ditches and drains are excluded: they are too small to drive the kind of
# inundation that forces a relocation decision.
OSM_WATERWAY_CLASSES = ["river", "stream", "canal"]

NETWORK_TIMEOUT_SEC = 180


def _overpass_query():
    """Build the Overpass QL query for waterways inside the padded bbox."""
    west, south, east, north = clipped_bbox()
    classes = "|".join(OSM_WATERWAY_CLASSES)
    return f"""
    [out:json][timeout:{NETWORK_TIMEOUT_SEC}];
    (
      way["waterway"~"^({classes})$"]({south},{west},{north},{east});
    );
    out geom;
    """


def fetch_from_overpass():
    """
    Fetch waterway centrelines from OSM Overpass.

    Returns a GeoJSON FeatureCollection dict, or None if every endpoint fails.
    """
    query = _overpass_query()
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            logger.info("Requesting waterways from %s", endpoint)
            request = urllib.request.Request(
                endpoint,
                data=query.encode("utf-8"),
                headers={"User-Agent": "AapdaSetu/1.0 (SIH 2026 prototype)"},
            )
            with urllib.request.urlopen(request, timeout=NETWORK_TIMEOUT_SEC) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("Overpass endpoint %s failed: %s", endpoint, exc)
            continue

        features = []
        for element in payload.get("elements", []):
            geometry = element.get("geometry")
            if not geometry or len(geometry) < 2:
                continue
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "name": element.get("tags", {}).get("name"),
                        "waterway": element.get("tags", {}).get("waterway"),
                        "osm_id": element.get("id"),
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[p["lon"], p["lat"]] for p in geometry],
                    },
                }
            )

        if features:
            logger.info("Overpass returned %d waterway ways", len(features))
            return {
                "type": "FeatureCollection",
                "source": "OSM Overpass (waterway=river|stream|canal)",
                "source_fidelity": "surveyed_channel_centreline",
                "features": features,
            }

    return None


def fetch_from_natural_earth():
    """
    Fetch major river centrelines from the Natural Earth 10m vector dataset.

    Fallback only. Natural Earth is cartographically generalised, so positions
    carry kilometre-scale error; callers must surface that limitation.
    """
    try:
        logger.info("Requesting Natural Earth 10m rivers")
        request = urllib.request.Request(
            NATURAL_EARTH_RIVERS_URL,
            headers={"User-Agent": "AapdaSetu/1.0 (SIH 2026 prototype)"},
        )
        with urllib.request.urlopen(request, timeout=NETWORK_TIMEOUT_SEC) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.error("Natural Earth fetch failed: %s", exc)
        return None

    west, south, east, north = clipped_bbox()
    features = []

    for feature in payload.get("features", []):
        geometry = feature.get("geometry") or {}
        parts = []
        if geometry.get("type") == "LineString":
            parts = [geometry["coordinates"]]
        elif geometry.get("type") == "MultiLineString":
            parts = geometry["coordinates"]

        for part in parts:
            clipped = _clip_linestring(part, west, south, east, north)
            for segment in clipped:
                if len(segment) < 2:
                    continue
                features.append(
                    {
                        "type": "Feature",
                        "properties": {
                            "name": feature["properties"].get("name").replace("Mamas", "Manas") if feature["properties"].get("name") else None,
                            "waterway": "river",
                            "scalerank": feature["properties"].get("scalerank"),
                        },
                        "geometry": {"type": "LineString", "coordinates": segment},
                    }
                )

    if not features:
        return None

    logger.info("Natural Earth returned %d clipped river segments", len(features))
    return {
        "type": "FeatureCollection",
        "source": "Natural Earth 10m rivers + lake centrelines",
        "source_fidelity": "generalised_1_10m_cartographic",
        "features": features,
    }


def _clip_linestring(coordinates, west, south, east, north):
    """
    Split a coordinate list into the runs of consecutive vertices that fall
    inside the bbox.

    A crude vertex-membership clip rather than a true geometric intersection:
    good enough here because the bbox is padded well beyond the habitations,
    so a channel is never truncated close to where a distance is measured.
    """
    runs = []
    current = []
    for lon, lat in coordinates:
        if west <= lon <= east and south <= lat <= north:
            current.append([lon, lat])
        elif current:
            runs.append(current)
            current = []
    if current:
        runs.append(current)
    return runs


def fetch_and_cache(force=False):
    """
    Populate the waterway cache, preferring OSM and falling back to Natural
    Earth. Returns the path to the cache file, or None if both sources failed.
    """
    ensure_cache_dir()

    if HYDRO_CACHE.exists() and not force:
        logger.info("Waterway cache already present at %s (use force=True to refresh)", HYDRO_CACHE)
        return HYDRO_CACHE

    collection = fetch_from_overpass()
    if collection is None:
        logger.warning("Overpass unavailable - falling back to Natural Earth")
        collection = fetch_from_natural_earth()

    if collection is None:
        logger.error("Every hydrography source failed. Cache not written.")
        return None

    HYDRO_CACHE.write_text(json.dumps(collection), encoding="utf-8")
    logger.info(
        "Cached %d waterway features from %s to %s",
        len(collection["features"]),
        collection["source"],
        HYDRO_CACHE,
    )
    return HYDRO_CACHE


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    force = "--force" in sys.argv
    path = fetch_and_cache(force=force)
    if path is None:
        print("FAILED: no hydrography source reachable. See log above.")
        return 1
    collection = json.loads(path.read_text(encoding="utf-8"))
    print(f"OK: {len(collection['features'])} features cached")
    print(f"    source:   {collection['source']}")
    print(f"    fidelity: {collection['source_fidelity']}")
    print(f"    path:     {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
