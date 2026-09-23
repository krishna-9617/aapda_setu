"""
Flood-exposure signal derived from the cached waterway layer.

For every habitation this computes the distance to the nearest mapped river or
stream centreline. Proximity to a channel is the single strongest readily
available predictor of fluvial inundation exposure in a floodplain district:
the Brahmaputra and the Manas are what put Barpeta under water, and how far a
settlement sits from either is a real, measurable, checkable quantity.

Distances are computed in a projected CRS (UTM 46N) rather than in degrees.
A degree of longitude at 26.3degN is ~99.8 km against ~111.3 km for a degree of
latitude; measuring in raw degrees would stretch every east-west distance by
about 11% and quietly bias the ranking.

What this signal is NOT: a hydraulic model. It carries no discharge, no stage,
no return period, and no channel capacity. It is a proximity term, and the
pipeline's non-claims note says so in as many words.
"""

import json
import logging

from geo.region import CRS_GEOGRAPHIC, CRS_PROJECTED, HYDRO_CACHE

logger = logging.getLogger(__name__)


class HydrographyUnavailable(Exception):
    """Raised when the waterway cache is missing."""


def hydrography_available():
    """True when a cached waterway layer exists on disk."""
    return HYDRO_CACHE.exists()


def _load_waterways():
    """Return (feature_collection, source_label, fidelity_label)."""
    if not hydrography_available():
        raise HydrographyUnavailable(
            f"No waterway cache at {HYDRO_CACHE}. "
            "Run `python -m geo.fetch_hydrography` first."
        )
    collection = json.loads(HYDRO_CACHE.read_text(encoding="utf-8"))
    return (
        collection,
        collection.get("source", "unknown"),
        collection.get("source_fidelity", "unknown"),
    )


def compute_water_distances(points):
    """
    Distance from each point to the nearest mapped waterway.

    points: iterable of (point_id, lat, lon)

    Returns (results, metadata). Each result is a dict with "available" plus
    "distance_to_water_m" and "nearest_waterway" when available, or "reason"
    when not. Metadata describes the layer the distances came from, so the
    caller can pass the provenance downstream intact.
    """
    points = list(points)

    try:
        collection, source, fidelity = _load_waterways()
    except HydrographyUnavailable as exc:
        logger.warning("Flood-exposure signal unavailable: %s", exc)
        return (
            {point_id: {"available": False, "reason": str(exc)} for point_id, _, _ in points},
            {"available": False, "reason": str(exc)},
        )

    from pyproj import Transformer
    from shapely.geometry import LineString, Point
    from shapely.ops import nearest_points

    to_metres = Transformer.from_crs(CRS_GEOGRAPHIC, CRS_PROJECTED, always_xy=True)

    channels = []
    for feature in collection["features"]:
        coordinates = feature["geometry"]["coordinates"]
        if len(coordinates) < 2:
            continue
        projected = [to_metres.transform(lon, lat) for lon, lat in coordinates]
        channels.append(
            {
                "name": feature["properties"].get("name") or "unnamed",
                "waterway": feature["properties"].get("waterway", "river"),
                "geometry": LineString(projected),
            }
        )

    if not channels:
        reason = "Waterway cache contains no usable line geometry"
        logger.warning(reason)
        return (
            {point_id: {"available": False, "reason": reason} for point_id, _, _ in points},
            {"available": False, "reason": reason},
        )

    logger.info("Measuring against %d waterway features from %s", len(channels), source)

    results = {}
    for point_id, lat, lon in points:
        x, y = to_metres.transform(lon, lat)
        location = Point(x, y)

        best_distance = None
        best_channel = None
        best_vertex = None

        for channel in channels:
            distance = location.distance(channel["geometry"])
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_channel = channel
                best_vertex = nearest_points(location, channel["geometry"])[1]

        results[point_id] = {
            "available": True,
            "distance_to_water_m": round(float(best_distance), 1),
            "nearest_waterway": best_channel["name"],
            "nearest_waterway_class": best_channel["waterway"],
            "nearest_point_utm": [round(best_vertex.x, 1), round(best_vertex.y, 1)],
        }

    metadata = {
        "available": True,
        "source": source,
        "fidelity": fidelity,
        "feature_count": len(channels),
        "measured_in": CRS_PROJECTED,
        "positional_uncertainty_note": (
            "Distances inherit the positional error of the source layer. "
            "Natural Earth 10m generalisation displaces channels by roughly "
            "1-3 km; OSM surveyed centrelines are typically within tens of metres."
            if "Natural Earth" in source
            else "OSM surveyed centrelines, typically accurate to tens of metres."
        ),
    }
    return results, metadata
