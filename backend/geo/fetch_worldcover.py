"""
fetch_worldcover.py -- One-time fetcher for the ESA WorldCover 10m land-cover
tile that covers the Barpeta district study area.

Run once, offline, ahead of a demo:

    python -m geo.fetch_worldcover

Writes backend/data/cache/barpeta_worldcover.tif

Used by site_filtering.py Stage 2 to exclude candidate shelter sites that
sit on land classified as permanently unsuitable (open water, wetland,
built-up already saturated). This replaces the boolean `terrain_safe` CSV
column with a real remote-sensing-derived exclusion.

ESA WorldCover v200 (2021), 10 m resolution.
Source: ESA WorldCover consortium, open data, CC BY 4.0.
Citation: Zanaga et al. (2022) doi:10.5281/zenodo.7254221
S3 host (no auth required): s3://esa-worldcover/v200/2021/map/ (eu-central-1)

Land cover class codes:
  10  Tree cover
  20  Shrubland
  30  Grassland
  40  Cropland
  50  Built-up
  60  Bare / sparse vegetation
  70  Snow and ice
  80  Permanent water bodies    <-- EXCLUDE shelter sites
  90  Herbaceous wetland        <-- EXCLUDE shelter sites
  95  Mangroves                 <-- EXCLUDE shelter sites
  100 Moss and lichen

Shelter site exclusions applied by Stage 2:
  - Permanent water bodies (80): site footprint is inundated by design
  - Herbaceous wetland (90): seasonally waterlogged, unsafe foundation
  - Mangroves (95): coastal/riverine, not present in Barpeta but included
    for completeness

Tree cover (10), cropland (40), grassland (30) are NOT excluded: schools
and colleges in Barpeta are routinely surrounded by or adjoin these classes.
Only permanent water and wetland create a hard safety disqualification.
"""

import logging
import sys
import urllib.error
import urllib.request
from pathlib import Path

from geo.region import CACHE_DIR, ensure_cache_dir

logger = logging.getLogger(__name__)

# WorldCover v200 (2021) -- no auth required, eu-central-1 public bucket
WORLDCOVER_BASE = (
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map"
)

# Barpeta district (lat 26.0-26.7, lon 90.6-91.3) falls in the 3-degree tile
# whose bottom edge is at 24°N in the WorldCover naming scheme.
# WorldCover v200 uses 3°×3° tiles named by the TOP-LEFT corner:
#   N24E090 covers lat 24°–27°N, lon 90°–93°E  <-- Barpeta falls here
# Confirmed by inspecting tile bounds (27N tile covers 27-30N, not 24-27N).
WORLDCOVER_TILE = "N24E090"
WORLDCOVER_FILENAME = f"ESA_WorldCover_10m_2021_v200_{WORLDCOVER_TILE}_Map.tif"

WORLDCOVER_CACHE = CACHE_DIR / "barpeta_worldcover.tif"
WORLDCOVER_SOURCE = "ESA WorldCover v200 (2021), 10 m, CC BY 4.0"
WORLDCOVER_CITATION = "Zanaga et al. (2022) doi:10.5281/zenodo.7254221"

NETWORK_TIMEOUT_SEC = 300
MIN_PLAUSIBLE_TIF_BYTES = 1_000_000  # ~1 MB minimum for a real COG tile


def fetch_and_cache(force=False):
    """
    Download the WorldCover tile covering Barpeta if not already cached.

    Returns the cache path on success, or None on failure.
    """
    ensure_cache_dir()

    if WORLDCOVER_CACHE.exists() and not force:
        size_mb = WORLDCOVER_CACHE.stat().st_size / 1e6
        logger.info(
            "WorldCover cache already present at %s (%.1f MB, use --force to refresh)",
            WORLDCOVER_CACHE, size_mb,
        )
        return WORLDCOVER_CACHE

    url = f"{WORLDCOVER_BASE}/{WORLDCOVER_FILENAME}"
    logger.info("Requesting WorldCover tile %s from ESA S3 (~85 MB)...", WORLDCOVER_TILE)

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AapdaSetu/1.0 (SIH 2026 prototype)"},
        )
        with urllib.request.urlopen(req, timeout=NETWORK_TIMEOUT_SEC) as response:
            payload = response.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        logger.error("WorldCover fetch failed: %s", exc)
        return None

    if len(payload) < MIN_PLAUSIBLE_TIF_BYTES:
        logger.error(
            "Downloaded only %d bytes -- too small to be a real tile, not caching",
            len(payload),
        )
        return None

    WORLDCOVER_CACHE.write_bytes(payload)
    logger.info(
        "Cached %.1f MB WorldCover tile to %s", len(payload) / 1e6, WORLDCOVER_CACHE
    )
    return WORLDCOVER_CACHE


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    force = "--force" in sys.argv
    path = fetch_and_cache(force=force)
    if path is None:
        print("FAILED: could not fetch WorldCover tile from ESA S3.")
        return 1
    size_mb = path.stat().st_size / 1e6
    print(f"OK: WorldCover tile cached at {path} ({size_mb:.1f} MB)")
    print(f"    Source:   {WORLDCOVER_SOURCE}")
    print(f"    Citation: {WORLDCOVER_CITATION}")
    print(f"    Tile:     {WORLDCOVER_TILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
