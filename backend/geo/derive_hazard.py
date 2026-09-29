"""
One-time derivation of hazard scores from raw geographic data.

    python -m geo.derive_hazard            # derive and write the artifact
    python -m geo.derive_hazard --compare  # also print old-vs-new comparison

Reads only the coordinates from habitations.csv. Everything else — slope,
height above drainage, distance to the nearest channel, and the hazard scores
built from them — is measured or computed here.

Writes backend/data/derived_hazard.json. data_loader.py consumes that file if
it exists; the CSV column remains as the fallback for any habitation whose
signals could not be measured, and the fallback is flagged per habitation
rather than hidden.

The optimizer, event simulator, and every downstream consumer are untouched by
this. All that changes is where hazard_score comes from.
"""

import argparse
import datetime
import json
import logging
import os

import pandas as pd

from geo import hazard_model
from geo.hydrography import compute_water_distances
from geo.region import DATA_DIR, DERIVED_HAZARD_PATH, DISTRICT_NAME, DISTRICT_STATE
from geo.terrain import compute_terrain_signals, dem_available

logger = logging.getLogger(__name__)

HABITATIONS_CSV = DATA_DIR / "habitations.csv"


def load_habitation_points():
    """Read id / name / coordinates / CSV scores from habitations.csv."""
    frame = pd.read_csv(HABITATIONS_CSV)
    records = []
    for _, row in frame.iterrows():
        records.append(
            {
                "habitation_id": row["habitation_id"],
                "name": row["name"],
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "csv_hazard_score": float(row.get("hazard_score", 0.0)),
                "csv_flood_score": float(row.get("flood_score", 0.0)),
                "csv_landslide_score": float(row.get("landslide_score", 0.0)),
                "vulnerability_score": float(row["vulnerability_score"]),
            }
        )
    return records


def derive_all():
    """
    Run the full derivation for every habitation.

    Returns the artifact dict that gets written to derived_hazard.json.
    """
    records = load_habitation_points()
    points = [(r["habitation_id"], r["lat"], r["lon"]) for r in records]

    terrain_signals = compute_terrain_signals(points)
    water_signals, water_metadata = compute_water_distances(points)

    habitations = {}
    fallback_count = 0

    for record in records:
        habitation_id = record["habitation_id"]
        derived = hazard_model.derive_scores(
            terrain_signals.get(habitation_id, {"available": False, "reason": "not computed"}),
            water_signals.get(habitation_id, {"available": False, "reason": "not computed"}),
            hydro_fidelity=water_metadata.get("fidelity"),
        )

        flood_score = derived["flood_score"]
        landslide_score = derived["landslide_score"]

        flood_source = "derived"
        landslide_source = "derived"

        if flood_score is None:
            flood_score = record["csv_flood_score"]
            flood_source = "csv_fallback"
            fallback_count += 1
        if landslide_score is None:
            landslide_score = record["csv_landslide_score"]
            landslide_source = "csv_fallback"
            fallback_count += 1

        # Dominant hazard and the headline hazard_score follow the same rule
        # data_loader has always used: whichever hazard scores higher.
        if landslide_score > flood_score:
            dominant_hazard = "landslide"
            hazard_score = landslide_score
        else:
            dominant_hazard = "flood"
            hazard_score = flood_score

        priority_score = hazard_model.compute_priority_score(
            hazard_score, record["vulnerability_score"]
        )
        red_zone_band = hazard_model.classify_red_zone_band(priority_score)

        habitations[habitation_id] = {
            "habitation_id": habitation_id,
            "name": record["name"],
            "flood_score": round(flood_score, 4),
            "landslide_score": round(landslide_score, 4),
            "hazard_score": round(hazard_score, 4),
            "dominant_hazard": dominant_hazard,
            "priority_score": round(priority_score, 4),
            "red_zone_band": red_zone_band,
            "flood_score_source": flood_source,
            "landslide_score_source": landslide_source,
            "hazard_score_source": (
                landslide_source if dominant_hazard == "landslide" else flood_source
            ),
            "previous_csv_values": {
                "hazard_score": record["csv_hazard_score"],
                "flood_score": record["csv_flood_score"],
                "landslide_score": record["csv_landslide_score"],
            },
            "provenance": derived["provenance"],
        }

    return {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "district": f"{DISTRICT_NAME}, {DISTRICT_STATE}",
        "pipeline_version": 1,
        "inputs": {
            "dem": {
                "available": dem_available(),
                "note": (
                    "SRTM/NASADEM GeoTIFF cached by geo.fetch_dem"
                    if dem_available()
                    else "No DEM cached - slope and height-above-drainage reported UNAVAILABLE"
                ),
            },
            "hydrography": water_metadata,
        },
        "model_constants": {
            "flood_proximity_decay_m": hazard_model.proximity_decay_for(
                water_metadata.get("fidelity")
            ),
            "flood_proximity_decay_surveyed_m": hazard_model.FLOOD_PROXIMITY_DECAY_SURVEYED_M,
            "flood_proximity_decay_generalised_m": hazard_model.FLOOD_PROXIMITY_DECAY_GENERALISED_M,
            "hand_ceiling_m": hazard_model.HAND_CEILING_M,
            "flat_slope_deg": hazard_model.FLAT_SLOPE_DEG,
            "steep_slope_deg": hazard_model.STEEP_SLOPE_DEG,
            "landslide_min_slope_deg": hazard_model.LANDSLIDE_MIN_SLOPE_DEG,
            "landslide_sat_slope_deg": hazard_model.LANDSLIDE_SAT_SLOPE_DEG,
            "flood_weights": hazard_model.FLOOD_WEIGHTS,
            "landslide_weights": hazard_model.LANDSLIDE_WEIGHTS,
        },
        "fallback_count": fallback_count,
        "non_claims_note": hazard_model.NON_CLAIMS_NOTE,
        "habitations": habitations,
    }


def print_comparison(artifact):
    """Print a side-by-side of the old CSV values against the derived ones."""
    header = (
        f"{'ID':<9}{'Name':<11}{'dist_km':>9}{'nearest':>13}"
        f"{'flood_old':>10}{'flood_new':>10}"
        f"{'slide_old':>10}{'slide_new':>10}"
        f"{'haz_old':>9}{'haz_new':>9}{'band':>10}  {'haz_source':<13}"
    )
    print(header)
    print("-" * len(header))

    for entry in artifact["habitations"].values():
        previous = entry["previous_csv_values"]
        raw = entry["provenance"]["raw_measurements"]
        distance = raw.get("distance_to_water_m")
        distance_text = "-" if distance is None else f"{distance / 1000:.1f}"
        nearest = (raw.get("nearest_waterway") or "-")[:12]
        print(
            f"{entry['habitation_id']:<9}{entry['name'][:10]:<11}"
            f"{distance_text:>9}{nearest:>13}"
            f"{previous['flood_score']:>10.2f}{entry['flood_score']:>10.4f}"
            f"{previous['landslide_score']:>10.2f}{entry['landslide_score']:>10.4f}"
            f"{previous['hazard_score']:>9.2f}{entry['hazard_score']:>9.4f}"
            f"{entry['red_zone_band']:>10}  {entry['hazard_score_source']:<13}"
        )


def main():
    parser = argparse.ArgumentParser(description="Derive hazard scores from geographic data")
    parser.add_argument("--compare", action="store_true", help="print old vs new comparison")
    parser.add_argument("--dry-run", action="store_true", help="do not write the artifact")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    artifact = derive_all()

    if not args.dry_run:
        DERIVED_HAZARD_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
        logger.info("Wrote %s", DERIVED_HAZARD_PATH)

    print()
    print(f"District:      {artifact['district']}")
    print(f"DEM available: {artifact['inputs']['dem']['available']}")
    hydro = artifact["inputs"]["hydrography"]
    print(f"Hydrography:   {hydro.get('source', hydro.get('reason'))}")
    print(f"CSV fallbacks: {artifact['fallback_count']}")
    print()

    if args.compare:
        print_comparison(artifact)
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
