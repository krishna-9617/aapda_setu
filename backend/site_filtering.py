"""
site_filtering.py -- Four-stage candidate shelter site filter.

Stage 1: Hazard Suitability       -- site's own hazard_score must be < 0.7
Stage 2: Land Cover Suitability   -- WorldCover land-cover class check
                                     (excludes permanent water / wetland).
                                     Falls back to terrain_safe CSV boolean
                                     when the WorldCover cache is absent.
Stage 3: Infrastructure Suitability -- effective_capacity must be > 0
Stage 4: Accessibility              -- at least one open route to this hab

WorldCover Stage 2 logic
------------------------
Uses ESA WorldCover v200 (2021), 10 m, fetched by geo.fetch_worldcover.
Source:   ESA WorldCover consortium, CC BY 4.0.
Citation: Zanaga et al. (2022) doi:10.5281/zenodo.7254221

A site is excluded at Stage 2 if the dominant land-cover class within a
50 m radius of the site's coordinates is one of the permanently unsafe
classes (open water = 80, herbaceous wetland = 90, mangroves = 95).

"Dominant" = modal pixel value in the window, majority-rules. If all
pixels in the window are no-data, the site passes Stage 2 with a
provenance note ("WorldCover: no-data at this location, pass assumed").

Rationale for excluded classes:
  80 (Permanent water bodies): site footprint is under water in the dry
     season; inundation risk during a flood event is effectively certain.
  90 (Herbaceous wetland): seasonally waterlogged, bearing-capacity for
     temporary shelters is severely compromised.
  95 (Mangroves): coastal/riverine, not present in Barpeta but included
     for completeness and portability to other districts.

Classes NOT excluded:
  10 Tree cover, 30 Grassland, 40 Cropland: schools and colleges in
     Barpeta are routinely adjacent to these classes. Adjacency to a
     crop or tree class does not make the building unsafe.
  50 Built-up: expected for an urban/peri-urban school building.
"""

import logging
import math
from pathlib import Path

logger = logging.getLogger(__name__)

# --- WorldCover constants ------------------------------------------------
_WORLDCOVER_CACHE = (
    Path(__file__).resolve().parent / "data" / "cache" / "barpeta_worldcover.tif"
)

# Land cover class codes that disqualify a shelter site (Stage 2).
UNSAFE_LANDCOVER_CLASSES = {
    80: "Permanent water bodies",
    90: "Herbaceous wetland",
    95: "Mangroves",
}

# Radius (metres) of the window used to sample land cover around each site.
# 50 m = roughly the footprint of a medium school building.
WORLDCOVER_SAMPLE_RADIUS_M = 50.0

# Metres per degree of latitude (WGS84 mean); used to convert radius to degrees.
_METRES_PER_DEG_LAT = 111_320.0


def _worldcover_available():
    return _WORLDCOVER_CACHE.exists()



_WORLDCOVER_CACHE_DATA = None  # module-level in-memory cache


def _load_worldcover():
    """Return (array, transform) for the cached WorldCover tile.

    The tile is read from disk exactly once per process and held in memory.
    Subsequent calls return the cached tuple immediately. The full tile is
    ~98 MB as a uint8 numpy array -- acceptable resident memory for a
    demo-scale system. This avoids re-reading the tile on every call to
    filter_candidate_sites (which is called once per habitation-site pair
    during every optimizer invocation).
    """
    global _WORLDCOVER_CACHE_DATA
    if _WORLDCOVER_CACHE_DATA is not None:
        return _WORLDCOVER_CACHE_DATA
    try:
        import rasterio
    except ImportError:
        raise RuntimeError("rasterio is required to read the WorldCover cache")
    with rasterio.open(_WORLDCOVER_CACHE) as ds:
        _WORLDCOVER_CACHE_DATA = ds.read(1), ds.transform
    return _WORLDCOVER_CACHE_DATA



def _dominant_landcover(array, transform, lat, lon, radius_m):
    """
    Return the modal (most frequent) pixel value within radius_m of (lat, lon).

    Returns (class_code, pixel_count) or (None, 0) if the window is all
    no-data (value 0 in WorldCover means undefined/fill).
    """
    import numpy as np

    inverse = ~transform
    col_c, row_c = inverse @ (lon, lat)
    # Convert radius from metres to pixels (WorldCover is ~10 m/pixel)
    pix_size_x = abs(transform.a)  # degrees per pixel
    radius_deg_lon = radius_m / (_METRES_PER_DEG_LAT * math.cos(math.radians(lat)))
    radius_deg_lat = radius_m / _METRES_PER_DEG_LAT
    pix_radius_x = int(math.ceil(radius_deg_lon / pix_size_x))
    pix_size_y = abs(transform.e)
    pix_radius_y = int(math.ceil(radius_deg_lat / pix_size_y))

    row_lo = max(0, int(row_c) - pix_radius_y)
    row_hi = min(array.shape[0], int(row_c) + pix_radius_y + 1)
    col_lo = max(0, int(col_c) - pix_radius_x)
    col_hi = min(array.shape[1], int(col_c) + pix_radius_x + 1)

    window = array[row_lo:row_hi, col_lo:col_hi]
    valid = window[window > 0]  # 0 = fill/no-data in WorldCover
    if valid.size == 0:
        return None, 0

    values, counts = np.unique(valid, return_counts=True)
    dominant_idx = int(np.argmax(counts))
    return int(values[dominant_idx]), int(counts[dominant_idx])


def _stage2_worldcover(site_lat, site_lon, site_name):
    """
    Stage 2 using ESA WorldCover.

    Returns (pass: bool, reason: str)
    """
    try:
        array, transform = _load_worldcover()
    except Exception as exc:
        logger.warning(
            "WorldCover read failed for %s: %s -- falling back to pass", site_name, exc
        )
        return True, f"WorldCover: read error ({exc}), pass assumed"

    dominant_class, pixel_count = _dominant_landcover(
        array, transform, site_lat, site_lon, WORLDCOVER_SAMPLE_RADIUS_M
    )

    if dominant_class is None:
        return True, "WorldCover: no valid pixels in sample window, pass assumed"

    if dominant_class in UNSAFE_LANDCOVER_CLASSES:
        label = UNSAFE_LANDCOVER_CLASSES[dominant_class]
        return (
            False,
            f"WorldCover Stage 2: dominant land cover class {dominant_class} ({label}) "
            f"-- unsafe for shelter site (pixels in window: {pixel_count})",
        )

    # All good -- record the class for traceability
    from geo.fetch_worldcover import WORLDCOVER_SOURCE
    return (
        True,
        f"WorldCover Stage 2: dominant class {dominant_class} "
        f"(pixels: {pixel_count}), source: {WORLDCOVER_SOURCE}",
    )


def filter_candidate_sites(habitation_id, habitations, sites, routes):
    """
    Filters sites for a given habitation through 4 sequential stages.

    Returns:
        candidate_sites: list of valid site IDs
        exclusions: list of strings describing why a site was excluded
    """
    use_worldcover = _worldcover_available()
    if not use_worldcover:
        logger.debug(
            "WorldCover cache absent -- Stage 2 will use terrain_safe CSV boolean. "
            "Run `python -m geo.fetch_worldcover` to enable land-cover filtering."
        )

    candidate_sites = []
    exclusions = []

    for site_id, site in sites.items():
        # Stage 1: Hazard Suitability
        if site.get("hazard_score", 0) > 0.7:
            exclusions.append(
                f"{site_id} ({site['name']}) excluded: Stage 1 - inside hazard zone "
                f"(score {site['hazard_score']})"
            )
            continue

        # Stage 2: Land Cover / Terrain Suitability
        if use_worldcover:
            site_lat = site.get("lat")
            site_lon = site.get("lon")
            if site_lat is not None and site_lon is not None:
                passes, reason = _stage2_worldcover(
                    float(site_lat), float(site_lon), site["name"]
                )
                if not passes:
                    exclusions.append(
                        f"{site_id} ({site['name']}) excluded: {reason}"
                    )
                    continue
                # Passes -- reason is logged at DEBUG for traceability
                logger.debug("%s Stage 2: %s", site_id, reason)
            else:
                # No coordinates in site record -- skip WorldCover check
                logger.warning(
                    "%s has no lat/lon in site record; Stage 2 WorldCover check skipped",
                    site_id,
                )
        else:
            # Fallback: use CSV boolean
            if not site.get("terrain_safe", True):
                exclusions.append(
                    f"{site_id} ({site['name']}) excluded: Stage 2 - poor elevation/"
                    f"drainage (terrain_safe=False in CSV; WorldCover not cached)"
                )
                continue

        # Stage 3: Infrastructure Suitability
        if site.get("effective_capacity", 0) == 0:
            exclusions.append(
                f"{site_id} ({site['name']}) excluded: Stage 3 - effective capacity "
                f"is zero (resource depleted)"
            )
            continue

        # Stage 4: Accessibility
        open_routes = [
            k for k, r in routes.items()
            if r["from_habitation_id"] == habitation_id
            and r["to_site_id"] == site_id
            and r.get("status", "open") == "open"
        ]

        if not open_routes:
            exclusions.append(
                f"{site_id} ({site['name']}) excluded: Stage 4 - no open route from "
                f"{habitations[habitation_id]['name']}"
            )
            continue

        # All 4 stages passed
        candidate_sites.append(site_id)

    return candidate_sites, exclusions
