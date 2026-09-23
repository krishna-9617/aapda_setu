"""
Study-region constants for Aapda Setu's self-derived hazard pipeline.

Everything geographic that used to be implicit (or hard-coded inside a
function) lives here so that pointing the system at a different district is a
one-file change.

Current region: Barpeta district, Assam, India.
"""

from pathlib import Path

# --------------------------------------------------------------------------
# Study-area bounding box (WGS84 / EPSG:4326)
# --------------------------------------------------------------------------
# Barpeta district administrative extent, padded outward so that rivers and
# terrain *just outside* the district still influence habitations near the
# border (a habitation 500 m from the district edge is still exposed to the
# river on the other side of that edge).
DISTRICT_NAME = "Barpeta"
DISTRICT_STATE = "Assam"
DISTRICT_COUNTRY = "India"

BBOX_WEST = 90.60
BBOX_EAST = 91.30
BBOX_SOUTH = 26.00
BBOX_NORTH = 26.70

# Padding (degrees) applied when clipping regional data layers.
CLIP_PAD_DEG = 0.50

# --------------------------------------------------------------------------
# Projections
# --------------------------------------------------------------------------
# WGS84 lat/lon — the CRS every input arrives in.
CRS_GEOGRAPHIC = "EPSG:4326"

# UTM zone 46N covers 90degE-96degE, which contains Barpeta. Used whenever a
# distance must be measured in metres rather than degrees; measuring in
# degrees near 26degN understates east-west distance by ~10%.
CRS_PROJECTED = "EPSG:32646"

# --------------------------------------------------------------------------
# Cache locations
# --------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"

DEM_CACHE = CACHE_DIR / "barpeta_dem.tif"
HYDRO_CACHE = CACHE_DIR / "barpeta_waterways.geojson"
ROAD_GRAPH_CACHE = CACHE_DIR / "barpeta_roads.graphml"

DERIVED_HAZARD_PATH = DATA_DIR / "derived_hazard.json"
DERIVED_ROUTES_PATH = DATA_DIR / "derived_routes.json"


def clipped_bbox():
    """Return the padded study bbox as (west, south, east, north)."""
    return (
        BBOX_WEST - CLIP_PAD_DEG,
        BBOX_SOUTH - CLIP_PAD_DEG,
        BBOX_EAST + CLIP_PAD_DEG,
        BBOX_NORTH + CLIP_PAD_DEG,
    )


def ensure_cache_dir():
    """Create the cache directory if it does not exist yet."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR
