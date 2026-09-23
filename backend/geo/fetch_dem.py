"""
One-time fetcher for the digital elevation model (DEM) tile covering the study
region.

Run once, offline, ahead of a demo:

    python -m geo.fetch_dem

It writes backend/data/cache/barpeta_dem.tif. Nothing at request time ever
touches the network — terrain.py only reads this cache.

Sources attempted, in order:

  1. OpenTopography public API, Copernicus GLO-30 (COP30, 30 m). Same API and
     key as SRTM; higher absolute accuracy than SRTM in flat terrain.
  2. OpenTopography public API, SRTMGL1 (30 m). No login required for tiles of
     this size. Returns GeoTIFF directly.
  3. OpenTopography SRTMGL3 (90 m) — same API, coarser, used if GL1 is
     rate-limited.
  4. NASADEM (30 m, OpenTopography) as a last resort.

If every source is unreachable the cache is simply not written, and terrain.py
reports its slope / elevation signals as UNAVAILABLE rather than inventing
them. That is deliberate: a fabricated elevation is worse than a missing one,
because a missing one is visible.

Vertical accuracy note for the record: SRTM's stated vertical error is about
+/-16 m (90% CI, ~6 m RMSE in flat terrain). Barpeta sits on the Brahmaputra
floodplain, where true relief across the district is on the order of 10-20 m.
The slope signal derived here is therefore informative about broad
floodplain-versus-terrace position, but it cannot resolve metre-scale
micro-topography, and no claim to that effect is made anywhere downstream.
"""

import logging
import os
import sys
import urllib.error
import urllib.request


from geo.region import DEM_CACHE, clipped_bbox, ensure_cache_dir

logger = logging.getLogger(__name__)

NETWORK_TIMEOUT_SEC = 300
MIN_PLAUSIBLE_TIF_BYTES = 10_000


OPENTOPO_BASE = "https://portal.opentopography.org/API/globaldem"



def _opentopo_url(dem_type):
    west, south, east, north = clipped_bbox()
    api_key = os.environ.get("OPENTOPOGRAPHY_API_KEY", "")
    key_param = f"&API_Key={api_key}" if api_key else ""
    if not api_key:
        logger.warning(
            "OPENTOPOGRAPHY_API_KEY is not set. OpenTopography requires a free API key "
            "(register at portal.opentopography.org -> My Account -> API Key). "
            "Set it with: $env:OPENTOPOGRAPHY_API_KEY = 'your_key_here'"
        )
    return (
        f"{OPENTOPO_BASE}?demtype={dem_type}"
        f"&south={south}&north={north}&west={west}&east={east}"
        f"&outputFormat=GTiff{key_param}"
    )


DEM_SOURCES = [
    ("Copernicus GLO-30 (30 m, OpenTopography)", lambda: _opentopo_url("COP30")),
    ("SRTMGL1 (30 m, OpenTopography)",           lambda: _opentopo_url("SRTMGL1")),
    ("SRTMGL3 (90 m, OpenTopography)",           lambda: _opentopo_url("SRTMGL3")),
    ("NASADEM (30 m, OpenTopography)",           lambda: _opentopo_url("NASADEM")),
]




def _download(url):
    """Download a URL and return its bytes, or None on any failure."""
    request = urllib.request.Request(
        url, headers={"User-Agent": "AapdaSetu/1.0 (SIH 2026 prototype)"}
    )
    with urllib.request.urlopen(request, timeout=NETWORK_TIMEOUT_SEC) as response:
        return response.read()


def fetch_and_cache(force=False):
    """
    Populate the DEM cache from the first reachable source.

    Returns the cache path on success, or None if no source was reachable.
    """
    ensure_cache_dir()

    if DEM_CACHE.exists() and not force:
        logger.info("DEM cache already present at %s (use --force to refresh)", DEM_CACHE)
        return DEM_CACHE

    for label, url_builder in DEM_SOURCES:
        url = url_builder()
        try:
            logger.info("Requesting DEM: %s", label)
            payload = _download(url)
        except (urllib.error.URLError, TimeoutError) as exc:
            logger.warning("%s failed: %s", label, exc)
            continue

        if payload is None or len(payload) < MIN_PLAUSIBLE_TIF_BYTES:
            logger.warning(
                "%s returned %s bytes - too small to be a DEM tile, skipping",
                label,
                0 if payload is None else len(payload),
            )
            continue

        DEM_CACHE.write_bytes(payload)
        logger.info("Cached %.1f MB DEM from %s to %s", len(payload) / 1e6, label, DEM_CACHE)
        return DEM_CACHE

    logger.error(
        "No DEM source reachable. Terrain-derived signals will report as "
        "UNAVAILABLE rather than being estimated."
    )
    return None


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    path = fetch_and_cache(force="--force" in sys.argv)
    if path is None:
        print("FAILED: no DEM source reachable from this machine.")
        print("Terrain signals will be reported as UNAVAILABLE (not estimated).")
        return 1
    print(f"OK: DEM cached at {path} ({path.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
