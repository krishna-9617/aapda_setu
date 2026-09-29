"""
Hazard derivation.

The property that matters most here is the one about missing data: when a
signal cannot be measured, the score must either say so or redistribute weight
onto the signals that were measured. What it must never do is score the
missing signal as zero, because a zero reads as safety and there is no
evidence of safety in a measurement that was never taken.
"""

import math

import pytest

from geo import hazard_model as hm

AVAILABLE_TERRAIN = {
    "available": True,
    "elevation_m": 40.0,
    "slope_deg": 0.5,
    "elev_rel_drainage_m": 2.0,
}
MISSING_TERRAIN = {"available": False, "reason": "no DEM cached"}

AVAILABLE_WATER = {
    "available": True,
    "distance_to_water_m": 1000.0,
    "nearest_waterway": "Beki",
}
MISSING_WATER = {"available": False, "reason": "no waterway cache"}


class TestProximityTerm:
    def test_at_the_bank_scores_one(self):
        assert hm.flood_proximity_term(0.0, 3000.0) == pytest.approx(1.0)

    def test_one_decay_length_scores_one_over_e(self):
        assert hm.flood_proximity_term(3000.0, 3000.0) == pytest.approx(1 / math.e, abs=1e-6)

    def test_decays_monotonically(self):
        distances = [0, 500, 1000, 5000, 20000]
        scores = [hm.flood_proximity_term(d, 3000.0) for d in distances]
        assert scores == sorted(scores, reverse=True)

    def test_stays_inside_the_unit_interval(self):
        for distance in [0, 1, 1e3, 1e6]:
            assert 0.0 <= hm.flood_proximity_term(distance, 3000.0) <= 1.0

    def test_missing_distance_returns_none(self):
        assert hm.flood_proximity_term(None) is None


class TestDecaySelection:
    def test_generalised_layer_gets_the_longer_decay(self):
        """
        A trunk-rivers-only layer measures regional basin position, so it must
        not be scored with the short decay meant for surveyed local channels.
        """
        generalised = hm.proximity_decay_for("generalised_1_10m_cartographic")
        surveyed = hm.proximity_decay_for("surveyed_channel_centreline")
        assert generalised > surveyed

    def test_unknown_fidelity_defaults_to_surveyed(self):
        assert hm.proximity_decay_for(None) == hm.FLOOD_PROXIMITY_DECAY_SURVEYED_M


class TestLowLyingTerm:
    def test_at_the_drainage_datum_scores_one(self):
        assert hm.flood_lowlying_term(0.0) == pytest.approx(1.0)

    def test_above_the_ceiling_scores_zero(self):
        assert hm.flood_lowlying_term(hm.HAND_CEILING_M + 5) == pytest.approx(0.0)

    def test_below_the_datum_is_clamped_not_negative(self):
        """A habitation below the local datum is maximally exposed, not >1."""
        assert hm.flood_lowlying_term(-3.0) == pytest.approx(1.0)


class TestLandslideTerm:
    def test_flat_ground_scores_zero(self):
        assert hm.landslide_slope_term(0.5) == pytest.approx(0.0)

    def test_steep_ground_saturates(self):
        assert hm.landslide_slope_term(hm.LANDSLIDE_SAT_SLOPE_DEG + 10) == pytest.approx(1.0)

    def test_increases_with_slope_in_the_band(self):
        low = hm.landslide_slope_term(15.0)
        high = hm.landslide_slope_term(30.0)
        assert 0.0 < low < high < 1.0


class TestWeightRenormalisation:
    def test_full_signals_use_the_declared_weights(self):
        derived = hm.derive_scores(AVAILABLE_TERRAIN, AVAILABLE_WATER)
        weights = derived["provenance"]["flood"]["effective_weights"]
        assert weights["flood_proximity"] == pytest.approx(hm.FLOOD_WEIGHTS["flood_proximity"])

    def test_weights_always_sum_to_one(self):
        for terrain in (AVAILABLE_TERRAIN, MISSING_TERRAIN):
            derived = hm.derive_scores(terrain, AVAILABLE_WATER)
            weights = derived["provenance"]["flood"]["effective_weights"]
            assert sum(weights.values()) == pytest.approx(1.0)

    def test_missing_terrain_shifts_weight_onto_proximity(self):
        """
        Losing the DEM must not drag the flood score toward zero. The proximity
        term absorbs the freed weight instead.
        """
        derived = hm.derive_scores(MISSING_TERRAIN, AVAILABLE_WATER)
        weights = derived["provenance"]["flood"]["effective_weights"]
        assert weights == {"flood_proximity": pytest.approx(1.0)}

    def test_missing_terrain_does_not_zero_the_score(self):
        with_terrain = hm.derive_scores(AVAILABLE_TERRAIN, AVAILABLE_WATER)["flood_score"]
        without = hm.derive_scores(MISSING_TERRAIN, AVAILABLE_WATER)["flood_score"]
        assert without > 0
        assert abs(without - with_terrain) < 0.5


class TestMissingSignals:
    def test_no_dem_means_no_landslide_score(self):
        """Slope is the only landslide input, so without a DEM there is no score."""
        derived = hm.derive_scores(MISSING_TERRAIN, AVAILABLE_WATER)
        assert derived["landslide_score"] is None

    def test_no_signals_at_all_yields_no_scores(self):
        derived = hm.derive_scores(MISSING_TERRAIN, MISSING_WATER)
        assert derived["flood_score"] is None
        assert derived["landslide_score"] is None

    def test_reasons_are_propagated_not_swallowed(self):
        derived = hm.derive_scores(MISSING_TERRAIN, MISSING_WATER)
        unavailable = " ".join(derived["provenance"]["unavailable"])
        assert "no DEM cached" in unavailable
        assert "no waterway cache" in unavailable

    def test_missing_signals_are_named(self):
        derived = hm.derive_scores(MISSING_TERRAIN, AVAILABLE_WATER)
        missing = derived["provenance"]["flood"]["signals_missing"]
        assert "flood_lowlying" in missing
        assert "flood_flatness" in missing


class TestProvenance:
    def test_every_score_carries_the_non_claims_note(self):
        derived = hm.derive_scores(AVAILABLE_TERRAIN, AVAILABLE_WATER)
        note = derived["provenance"]["non_claims_note"]
        assert "not a certified probability" in note

    def test_raw_measurements_are_recorded(self):
        derived = hm.derive_scores(AVAILABLE_TERRAIN, AVAILABLE_WATER)
        raw = derived["provenance"]["raw_measurements"]
        assert raw["distance_to_water_m"] == 1000.0
        assert raw["slope_deg"] == pytest.approx(0.5)
        assert raw["nearest_waterway"] == "Beki"

    def test_scores_stay_inside_the_unit_interval(self):
        derived = hm.derive_scores(AVAILABLE_TERRAIN, AVAILABLE_WATER)
        assert 0.0 <= derived["flood_score"] <= 1.0
        assert 0.0 <= derived["landslide_score"] <= 1.0


class TestBanding:
    @pytest.mark.parametrize(
        "priority,expected",
        [(0.95, "critical"), (0.80, "critical"), (0.70, "high"),
         (0.60, "high"), (0.50, "moderate"), (0.40, "moderate"), (0.10, "low")],
    )
    def test_band_thresholds(self, priority, expected):
        assert hm.classify_red_zone_band(priority) == expected

    def test_priority_is_the_mean_of_hazard_and_vulnerability(self):
        assert hm.compute_priority_score(0.8, 0.4) == pytest.approx(0.6)

    def test_priority_matches_the_event_simulator_formula(self):
        """
        event_simulator recomputes priority after a rainfall event. If the two
        definitions drift, a habitation would be banded differently depending on
        which code path last touched it.
        """
        hazard, vulnerability = 0.73, 0.41
        simulator_formula = (hazard + vulnerability) / 2.0
        assert hm.compute_priority_score(hazard, vulnerability) == pytest.approx(
            simulator_formula
        )
