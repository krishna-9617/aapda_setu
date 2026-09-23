"""
The hazard-score derivation function.

WHAT THIS REPLACES
------------------
`hazard_score` used to arrive pre-computed in habitations.csv. Nobody could
say where the number came from. This module computes it instead, from
measured geographic signals, and records exactly which signals contributed to
each score.

NON-CLAIMS NOTE (applies to every number this module produces)
-------------------------------------------------------------
These scores reflect RELATIVE PHYSICAL EXPOSURE PATTERNS, NOT A CERTIFIED
PROBABILITY OF FLOODING OR LANDSLIDE.

Specifically, the output is NOT:
  * a probability, a return period, or an annual exceedance frequency;
  * the output of a hydraulic or hydrodynamic model (no discharge, no stage,
    no channel conveyance, no rainfall-runoff routing is computed anywhere);
  * a substitute for CWC / ASDMA / NRSC hazard zonation, or for any official
    flood hazard map;
  * a statement about any individual building, plot, or household.

It IS: a transparent, reproducible ordering of habitations by physical
exposure, built from open elevation and hydrography data, with each
contributing term and its weight visible in the provenance block attached to
every score. If a signal is unavailable, the score says so rather than
substituting a plausible-looking number.

THE SIGNALS
-----------
flood_proximity   Nearness to a mapped river or stream. Transformed with an
                  exponential decay, exp(-d / DECAY), because inundation
                  extent falls off sharply with distance from a channel rather
                  than linearly: a settlement 500 m from the Brahmaputra is far
                  more than twice as exposed as one 1000 m away. DECAY is set
                  to 3000 m, which is the order of the Brahmaputra's historic
                  overbank spill width in lower Assam.

flood_lowlying    Height above the local drainage datum, inverted and clipped.
                  A habitation at or below the datum scores 1.0; one more than
                  HAND_CEILING metres above it scores 0.0. Linear in between,
                  because over a range this small the relationship between
                  relative height and inundation depth is close to linear.

flood_flatness    Terrain flatness. Flat ground drains slowly and ponds; steep
                  ground sheds water. Mapped from slope through a soft
                  threshold at FLAT_SLOPE_DEG. This is the weakest of the three
                  flood terms and is weighted accordingly.

landslide_slope   Slope is the dominant topographic control on slope failure.
                  Below LANDSLIDE_MIN_SLOPE_DEG the score is zero (failures on
                  near-level ground are not a slope-stability phenomenon);
                  above LANDSLIDE_SAT_SLOPE_DEG it saturates at 1.0.

WEIGHTING AND MISSING SIGNALS
-----------------------------
Each hazard is a weighted mean of its terms. Weights are renormalised over the
terms that are actually available, so a missing DEM shifts all the weight onto
the terms that could be measured rather than silently scoring the missing ones
as zero (which would drag every score downward and look like safety).

Every derived score carries `signals_used`, `signals_missing`, and the
effective weights, so the provenance is auditable from the API response.
"""

import logging
import math

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Transform constants. Every magic number in this file is named here, with the
# reasoning for its value in the comment above it.
# --------------------------------------------------------------------------

# Exponential decay length for channel proximity, in metres. At this distance
# the proximity term has fallen to 1/e (~0.37) of its at-bank value.
#
# The right value depends on WHICH CHANNELS THE SOURCE LAYER CONTAINS, and
# getting this wrong in either direction is the easiest way to produce a
# confident-looking but meaningless score:
#
#   * A surveyed layer (OSM) includes the minor rivers that actually inundate
#     Barpeta - the Beki, Pahumara, Kaldia, Palla. Distance is then measured to
#     the nearest real channel, which in this district is rarely more than a few
#     kilometres, and a short decay is correct.
#
#   * A generalised layer (Natural Earth 10m) contains only trunk rivers - here
#     just the Brahmaputra and the Manas. Distance is then a REGIONAL position
#     within the basin, not local channel proximity. Barpeta's 2022 inundation
#     reached settlements more than 20 km from the Brahmaputra, so applying the
#     surveyed-layer decay to a trunk-only layer would score almost every
#     habitation near zero and read as safety where none was measured.
#
# Both values are stated here rather than tuned until the output looked right.
FLOOD_PROXIMITY_DECAY_SURVEYED_M = 3000.0
FLOOD_PROXIMITY_DECAY_GENERALISED_M = 15000.0

# Default used when the caller does not state the layer fidelity.
FLOOD_PROXIMITY_DECAY_M = FLOOD_PROXIMITY_DECAY_SURVEYED_M


def proximity_decay_for(fidelity):
    """
    Pick the decay length appropriate to the hydrography layer in use.

    fidelity: the "source_fidelity" string recorded by geo.fetch_hydrography.
    """
    if fidelity and "generalised" in fidelity:
        return FLOOD_PROXIMITY_DECAY_GENERALISED_M
    return FLOOD_PROXIMITY_DECAY_SURVEYED_M

# Height above the local drainage datum, in metres, at which the low-lying
# term reaches zero. Chosen to bracket the relief actually present on the
# Brahmaputra floodplain, where district-wide relief is on the order of 10-20 m.
HAND_CEILING_M = 12.0

# Slope at and below which terrain counts as fully flat for ponding purposes.
FLAT_SLOPE_DEG = 1.0

# Slope above which the flatness term is fully extinguished.
STEEP_SLOPE_DEG = 8.0

# Landslide slope band. Below the minimum, slope failure is not the relevant
# mechanism; above saturation, slope alone is enough to score maximum.
LANDSLIDE_MIN_SLOPE_DEG = 10.0
LANDSLIDE_SAT_SLOPE_DEG = 35.0

# Relative weights within the flood composite.
FLOOD_WEIGHTS = {
    "flood_proximity": 0.50,
    "flood_lowlying": 0.35,
    "flood_flatness": 0.15,
}

# Relative weights within the landslide composite.
LANDSLIDE_WEIGHTS = {
    "landslide_slope": 1.00,
}

# --------------------------------------------------------------------------
# Downstream classification thresholds.
#
# These mirror the bands already used in event_simulator.trigger_rainfall_event
# so that a habitation classified at load time and the same habitation
# reclassified after a rainfall event use one definition of "critical".
# --------------------------------------------------------------------------
PRIORITY_HAZARD_WEIGHT = 0.5
PRIORITY_VULNERABILITY_WEIGHT = 0.5

BAND_CRITICAL_MIN = 0.8
BAND_HIGH_MIN = 0.6
BAND_MODERATE_MIN = 0.4

NON_CLAIMS_NOTE = (
    "This score reflects relative physical exposure patterns, not a certified "
    "probability of flooding or landslide. It is not a hydraulic model output, "
    "not a return period, and not a substitute for official CWC/ASDMA hazard "
    "zonation."
)


def _clamp01(value):
    """Clamp to the closed unit interval."""
    return max(0.0, min(1.0, value))


def flood_proximity_term(distance_to_water_m, decay_m=None):
    """
    Exponential decay of flood exposure with distance from a mapped channel.

    exp(-d / decay): 1.0 at the bank, ~0.37 at one decay length, ~0.13 at two.
    decay_m defaults to the surveyed-layer value; pass the output of
    proximity_decay_for() when the layer fidelity is known.
    """
    if distance_to_water_m is None:
        return None
    decay = decay_m or FLOOD_PROXIMITY_DECAY_M
    return _clamp01(math.exp(-max(0.0, distance_to_water_m) / decay))


def flood_lowlying_term(elev_rel_drainage_m):
    """
    Inverted, clipped height above the local drainage datum.

    At or below the datum -> 1.0. At or above HAND_CEILING_M -> 0.0.
    """
    if elev_rel_drainage_m is None:
        return None
    return _clamp01(1.0 - (elev_rel_drainage_m / HAND_CEILING_M))


def flood_flatness_term(slope_deg):
    """
    Ponding potential from terrain flatness.

    Fully flat at or below FLAT_SLOPE_DEG, fully shed at or above
    STEEP_SLOPE_DEG, linear between the two.
    """
    if slope_deg is None:
        return None
    if slope_deg <= FLAT_SLOPE_DEG:
        return 1.0
    if slope_deg >= STEEP_SLOPE_DEG:
        return 0.0
    return _clamp01(
        (STEEP_SLOPE_DEG - slope_deg) / (STEEP_SLOPE_DEG - FLAT_SLOPE_DEG)
    )


def landslide_slope_term(slope_deg):
    """
    Slope-driven failure susceptibility, banded between the minimum and
    saturation slopes.
    """
    if slope_deg is None:
        return None
    if slope_deg <= LANDSLIDE_MIN_SLOPE_DEG:
        return 0.0
    if slope_deg >= LANDSLIDE_SAT_SLOPE_DEG:
        return 1.0
    return _clamp01(
        (slope_deg - LANDSLIDE_MIN_SLOPE_DEG)
        / (LANDSLIDE_SAT_SLOPE_DEG - LANDSLIDE_MIN_SLOPE_DEG)
    )


def _weighted_composite(terms, weights):
    """
    Weighted mean over the terms that are available, with weights renormalised
    across exactly those terms.

    Returns (score, detail). score is None when no term was available. detail
    carries the per-term values, the effective weights, and the names of the
    terms that could not be computed.
    """
    available = {name: value for name, value in terms.items() if value is not None}
    missing = [name for name, value in terms.items() if value is None]

    if not available:
        return None, {
            "terms": {},
            "effective_weights": {},
            "signals_used": [],
            "signals_missing": missing,
        }

    weight_total = sum(weights[name] for name in available)
    effective = {name: weights[name] / weight_total for name in available}
    score = sum(available[name] * effective[name] for name in available)

    return _clamp01(score), {
        "terms": {name: round(value, 4) for name, value in available.items()},
        "effective_weights": {name: round(value, 4) for name, value in effective.items()},
        "signals_used": sorted(available),
        "signals_missing": missing,
    }


def derive_scores(terrain_signal, water_signal, hydro_fidelity=None):
    """
    Combine one habitation's terrain and hydrography signals into flood and
    landslide scores.

    terrain_signal: the per-point dict from geo.terrain.compute_terrain_signals
    water_signal:   the per-point dict from geo.hydrography.compute_water_distances
    hydro_fidelity: the "fidelity" string from the hydrography metadata, used to
                    select an appropriate proximity decay length

    Returns a dict with flood_score, landslide_score (either may be None if no
    input signal was available), and a full provenance block.
    """
    terrain_ok = terrain_signal.get("available", False)
    water_ok = water_signal.get("available", False)

    slope_deg = terrain_signal.get("slope_deg") if terrain_ok else None
    hand_m = terrain_signal.get("elev_rel_drainage_m") if terrain_ok else None
    distance_m = water_signal.get("distance_to_water_m") if water_ok else None

    decay_m = proximity_decay_for(hydro_fidelity)

    flood_terms = {
        "flood_proximity": flood_proximity_term(distance_m, decay_m),
        "flood_lowlying": flood_lowlying_term(hand_m),
        "flood_flatness": flood_flatness_term(slope_deg),
    }
    landslide_terms = {
        "landslide_slope": landslide_slope_term(slope_deg),
    }

    flood_score, flood_detail = _weighted_composite(flood_terms, FLOOD_WEIGHTS)
    landslide_score, landslide_detail = _weighted_composite(
        landslide_terms, LANDSLIDE_WEIGHTS
    )

    unavailable_reasons = []
    if not terrain_ok:
        unavailable_reasons.append(f"terrain: {terrain_signal.get('reason', 'unavailable')}")
    if not water_ok:
        unavailable_reasons.append(f"hydrography: {water_signal.get('reason', 'unavailable')}")

    return {
        "flood_score": None if flood_score is None else round(flood_score, 4),
        "landslide_score": None if landslide_score is None else round(landslide_score, 4),
        "provenance": {
            "flood": flood_detail,
            "landslide": landslide_detail,
            "raw_measurements": {
                "slope_deg": None if slope_deg is None else round(slope_deg, 3),
                "elev_rel_drainage_m": None if hand_m is None else round(hand_m, 2),
                "elevation_m": (
                    round(terrain_signal["elevation_m"], 2)
                    if terrain_ok and terrain_signal.get("elevation_m") is not None
                    else None
                ),
                "distance_to_water_m": distance_m,
                "nearest_waterway": water_signal.get("nearest_waterway") if water_ok else None,
            },
            "proximity_decay_m": decay_m,
            "unavailable": unavailable_reasons,
            "non_claims_note": NON_CLAIMS_NOTE,
        },
    }


def compute_priority_score(hazard_score, vulnerability_score):
    """
    Combine hazard and vulnerability into the planning priority score.

    Identical to the recomputation inside event_simulator.trigger_rainfall_event,
    kept here as the single definition both paths can point at.
    """
    return _clamp01(
        PRIORITY_HAZARD_WEIGHT * hazard_score
        + PRIORITY_VULNERABILITY_WEIGHT * vulnerability_score
    )


def classify_red_zone_band(priority_score):
    """Map a priority score onto its red-zone band label."""
    if priority_score >= BAND_CRITICAL_MIN:
        return "critical"
    if priority_score >= BAND_HIGH_MIN:
        return "high"
    if priority_score >= BAND_MODERATE_MIN:
        return "moderate"
    return "low"
