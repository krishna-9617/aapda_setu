"""
ORS (OpenRouteService) and OSRM (Open Source Routing Machine) HTTP providers.

These are tried BEFORE falling back to the local OSM road graph. Either provider
returns real road-following geometry encoded as GeoJSON; this module normalises
both to the same dict schema used by routing.py.

Provider order in derive_routes.py:
  1. ORS   — if ORS_API_KEY env var is set (free tier: 40 req/min, 2000/day)
  2. OSRM  — public demo server (no key, rate-limit unknown; 1 s delay per req)
  3. OSM graph (routing.py) — local graph, no network at routing time
  4. csv_fallback           — straight-line estimate from routes.csv

Neither provider is called at request time — only during the one-time
`python -m geo.derive_routes` pipeline run. The output is cached to
data/derived_routes.json and served statically.
"""

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

NETWORK_TIMEOUT_SEC = 30
# Polite delay between OSRM public demo requests (1 req/s)
OSRM_INTER_REQUEST_DELAY_SEC = 1.0

ORS_BASE = "https://api.openrouteservice.org/v2/directions/driving-car"
OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"


def _get(url, headers=None):
    """GET a URL and return parsed JSON, or raise on any failure."""
    req = urllib.request.Request(
        url,
        headers=dict({"User-Agent": "AapdaSetu/1.0 (SIH 2026 prototype)"}, **(headers or {})),
    )
    with urllib.request.urlopen(req, timeout=NETWORK_TIMEOUT_SEC) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _decode_polyline6(encoded):
    """
    Decode a Google-style precision-6 encoded polyline to [[lat, lon], ...].

    ORS uses precision 6 (factor 1e6) by default. OSRM uses precision 5
    but we request overview=full&geometries=geojson from OSRM, so this
    function is only needed for ORS.
    """
    result = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        for coord in (True, False):  # lat then lon
            shift = 0
            b = 0
            while True:
                chunk = ord(encoded[index]) - 63
                index += 1
                b |= (chunk & 0x1F) << shift
                shift += 5
                if chunk < 0x20:
                    break
            delta = ~(b >> 1) if (b & 1) else (b >> 1)
            if coord:
                lat += delta
            else:
                lng += delta
        result.append([lat / 1e6, lng / 1e6])
    return result


def try_ors(habitation_lat, habitation_lon, site_lat, site_lon):
    """
    Try to route via OpenRouteService.

    Returns a route entry dict (source='ors') on success, None on any failure.
    Requires ORS_API_KEY environment variable.
    """
    api_key = os.environ.get("ORS_API_KEY")
    if not api_key:
        return None

    url = (
        f"{ORS_BASE}"
        f"?start={habitation_lon},{habitation_lat}"
        f"&end={site_lon},{site_lat}"
    )
    try:
        data = _get(url, headers={"Authorization": api_key})
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        logger.warning("ORS request failed: %s", exc)
        return None
    except Exception as exc:  # JSON parse errors, quota errors, etc.
        logger.warning("ORS unexpected error: %s: %s", type(exc).__name__, exc)
        return None

    try:
        feature = data["features"][0]
        props = feature["properties"]["summary"]
        distance_km = props["distance"] / 1000.0
        travel_time_min = props["duration"] / 60.0
        # ORS returns geometry as encoded polyline by default; decode it
        geometry_encoded = feature["geometry"]
        if isinstance(geometry_encoded, str):
            geometry = _decode_polyline6(geometry_encoded)
        else:
            # GeoJSON case (shouldn't happen with default params, but safe)
            coords = geometry_encoded.get("coordinates", [])
            geometry = [[lat, lon] for lon, lat in coords]
        return {
            "source": "ors",
            "distance_km": round(distance_km, 3),
            "travel_time_min": round(travel_time_min, 2),
            "geometry": geometry,
            "node_count": len(geometry),
            "rank": 0,
            "is_primary": True,
        }
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("ORS response parse error: %s", exc)
        return None


def try_osrm(habitation_lat, habitation_lon, site_lat, site_lon, delay=True):
    """
    Try to route via the OSRM public demo server.

    Returns a route entry dict (source='osrm') on success, None on any failure.
    Uses GeoJSON geometry so no polyline decoding is needed.
    """
    if delay:
        time.sleep(OSRM_INTER_REQUEST_DELAY_SEC)

    coords = f"{habitation_lon},{habitation_lat};{site_lon},{site_lat}"
    params = urllib.parse.urlencode({
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    })
    url = f"{OSRM_BASE}/{coords}?{params}"

    try:
        data = _get(url)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        logger.warning("OSRM request failed: %s", exc)
        return None
    except Exception as exc:
        logger.warning("OSRM unexpected error: %s: %s", type(exc).__name__, exc)
        return None

    try:
        if data.get("code") != "Ok":
            logger.warning("OSRM non-Ok code: %s", data.get("code"))
            return None
        route = data["routes"][0]
        distance_km = route["distance"] / 1000.0
        travel_time_min = route["duration"] / 60.0
        coords_list = route["geometry"]["coordinates"]  # [[lon, lat], ...]
        geometry = [[lat, lon] for lon, lat in coords_list]
        return {
            "source": "osrm",
            "distance_km": round(distance_km, 3),
            "travel_time_min": round(travel_time_min, 2),
            "geometry": geometry,
            "node_count": len(geometry),
            "rank": 0,
            "is_primary": True,
        }
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("OSRM response parse error: %s", exc)
        return None
