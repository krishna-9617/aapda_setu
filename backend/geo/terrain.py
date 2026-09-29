"""
Terrain signals derived from the cached DEM.

Two quantities are produced per habitation:

  slope_deg
      Local surface gradient in degrees, computed with Horn's (1981) 3x3
      finite-difference operator — the same kernel ArcGIS and GDAL use for
      their slope products. Cell spacing is converted from degrees to metres
      at the tile's central latitude before the gradient is taken, so the
      east-west and north-south steps are not silently assumed equal.

  elev_rel_drainage_m
      Height of the habitation above the local drainage datum, where the datum
      is a low percentile of elevation within a search window around the point.
      This is a HAND-style (Height Above Nearest Drainage) proxy: true HAND
      needs a flow-routing pass over the whole basin, which a 30 m tile of a
      single district cannot support honestly, so a windowed low-percentile
      stands in for the channel elevation. The substitution is recorded in the
      provenance block of every derived score.

If the DEM cache is absent, every function here returns an explicit
"unavailable" marker. Nothing is estimated, interpolated, or defaulted to a
plausible-looking number — a missing signal must stay visibly missing.
"""

import logging
import math

import numpy as np

from geo.region import DEM_CACHE

logger = logging.getLogger(__name__)

# Radius of the window, in DEM cells, used for the drainage-datum percentile.
# At 30 m/cell a radius of 25 spans ~1.5 km, wide enough to reach a channel in
# a floodplain setting without pulling in a different sub-basin.
DRAINAGE_WINDOW_CELLS = 25

# Percentile of in-window elevation treated as the local drainage surface.
# The 5th rather than the minimum, so that a single noisy low pixel (SRTM
# speckle over water is common) cannot set the datum on its own.
DRAINAGE_PERCENTILE = 5.0

# Metres per degree of latitude (WGS84 mean). Longitude spacing is this value
# scaled by cos(latitude).
METRES_PER_DEGREE_LAT = 111_320.0

# SRTM and NASADEM use this value for voids / no-data.
DEM_NODATA_SENTINEL = -32768


class TerrainUnavailable(Exception):
    """Raised when terrain signals are requested but no DEM cache exists."""


def dem_available():
    """True when a cached DEM tile exists on disk."""
    return DEM_CACHE.exists()


def _load_dem():
    """
    Read the cached DEM into memory.

    Returns (elevation_array, affine_transform, nodata_value). Raises
    TerrainUnavailable if there is no cache to read.
    """
    if not dem_available():
        raise TerrainUnavailable(
            f"No DEM cache at {DEM_CACHE}. Run `python -m geo.fetch_dem` first."
        )

    import rasterio  # imported lazily so the API can boot without rasterio

    with rasterio.open(DEM_CACHE) as dataset:
        elevation = dataset.read(1).astype("float64")
        transform = dataset.transform
        nodata = dataset.nodata if dataset.nodata is not None else DEM_NODATA_SENTINEL

    elevation[elevation == nodata] = np.nan
    elevation[elevation == DEM_NODATA_SENTINEL] = np.nan
    return elevation, transform, nodata


def _cell_size_metres(transform, centre_lat):
    """
    Convert the tile's degree-based pixel size into metres.

    Returns (x_metres, y_metres). Longitude degrees shrink by cos(latitude),
    which at Barpeta's 26.3degN is a ~10% correction — large enough that
    ignoring it would bias every east-west gradient.
    """
    x_deg = abs(transform.a)
    y_deg = abs(transform.e)
    x_m = x_deg * METRES_PER_DEGREE_LAT * math.cos(math.radians(centre_lat))
    y_m = y_deg * METRES_PER_DEGREE_LAT
    return x_m, y_m


def _horn_slope(elevation, x_metres, y_metres):
    """
    Slope in degrees via Horn's 3x3 operator.

    The kernel weights the four orthogonal neighbours twice as heavily as the
    four diagonal ones, which makes it noticeably more robust to single-pixel
    DEM noise than a plain central difference — the reason it is the standard
    choice for SRTM-grade data.
    """
    padded = np.pad(elevation, 1, mode="edge")

    z1 = padded[:-2, :-2]   # NW
    z2 = padded[:-2, 1:-1]  # N
    z3 = padded[:-2, 2:]    # NE
    z4 = padded[1:-1, :-2]  # W
    z6 = padded[1:-1, 2:]   # E
    z7 = padded[2:, :-2]    # SW
    z8 = padded[2:, 1:-1]   # S
    z9 = padded[2:, 2:]     # SE

    dz_dx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / (8 * x_metres)
    dz_dy = ((z7 + 2 * z8 + z9) - (z1 + 2 * z2 + z3)) / (8 * y_metres)

    return np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))


def _rowcol(transform, lon, lat):
    """Map a lon/lat pair to integer (row, col) indices in the DEM array."""
    inverse = ~transform
    col, row = inverse * (lon, lat)
    return int(round(row)), int(round(col))


def _window_percentile(array, row, col, radius, percentile):
    """Percentile of finite values in a square window, or None if all NaN."""
    row_lo = max(0, row - radius)
    row_hi = min(array.shape[0], row + radius + 1)
    col_lo = max(0, col - radius)
    col_hi = min(array.shape[1], col + radius + 1)

    window = array[row_lo:row_hi, col_lo:col_hi]
    finite = window[np.isfinite(window)]
    if finite.size == 0:
        return None
    return float(np.percentile(finite, percentile))


def compute_terrain_signals(points):
    """
    Compute slope and height-above-drainage for a set of points.

    points: iterable of (point_id, lat, lon)

    Returns a dict keyed by point_id. Each value is a dict with keys
    "available" (bool), plus "slope_deg", "elevation_m",
    "elev_rel_drainage_m" when available, or "reason" when not.

    When the DEM cache is missing, every point comes back unavailable with a
    reason — the caller is expected to propagate that, not paper over it.
    """
    points = list(points)

    try:
        elevation, transform, _ = _load_dem()
    except TerrainUnavailable as exc:
        logger.warning("Terrain signals unavailable: %s", exc)
        return {
            point_id: {"available": False, "reason": str(exc)}
            for point_id, _, _ in points
        }
    except ImportError as exc:
        reason = f"rasterio not installed ({exc}); cannot read DEM cache"
        logger.warning(reason)
        return {point_id: {"available": False, "reason": reason} for point_id, _, _ in points}

    centre_lat = float(np.mean([lat for _, lat, _ in points])) if points else 0.0
    x_metres, y_metres = _cell_size_metres(transform, centre_lat)
    slope = _horn_slope(elevation, x_metres, y_metres)

    logger.info(
        "DEM loaded: %dx%d cells, ~%.1f m x %.1f m per cell",
        elevation.shape[0],
        elevation.shape[1],
        x_metres,
        y_metres,
    )

    results = {}
    for point_id, lat, lon in points:
        row, col = _rowcol(transform, lon, lat)

        if not (0 <= row < elevation.shape[0] and 0 <= col < elevation.shape[1]):
            results[point_id] = {
                "available": False,
                "reason": f"({lat:.4f}, {lon:.4f}) falls outside the cached DEM tile",
            }
            continue

        point_elev = elevation[row, col]
        if not np.isfinite(point_elev):
            results[point_id] = {
                "available": False,
                "reason": f"DEM void (no-data) at ({lat:.4f}, {lon:.4f})",
            }
            continue

        datum = _window_percentile(
            elevation, row, col, DRAINAGE_WINDOW_CELLS, DRAINAGE_PERCENTILE
        )
        point_slope = float(slope[row, col]) if np.isfinite(slope[row, col]) else None

        results[point_id] = {
            "available": True,
            "elevation_m": float(point_elev),
            "slope_deg": point_slope,
            "elev_rel_drainage_m": (
                None if datum is None else float(point_elev - datum)
            ),
            "drainage_datum_m": datum,
            "method": {
                "slope": "Horn (1981) 3x3 finite difference",
                "drainage_datum": (
                    f"p{DRAINAGE_PERCENTILE:g} elevation within a "
                    f"{DRAINAGE_WINDOW_CELLS}-cell radius window (HAND proxy)"
                ),
            },
        }

    return results
