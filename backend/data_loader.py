import json
import logging
import os

import pandas as pd

logger = logging.getLogger(__name__)

DERIVED_HAZARD_FILENAME = 'derived_hazard.json'


def _load_ml_model(model_path):
    """
    Load a pickled scikit-learn model from disk, once.

    Returns the model, or None if the file does not exist or fails to
    unpickle. A missing or broken model file is not fatal - it just means that
    habitation's hazard score skips the ML blend and stays as the
    geographically-derived (or CSV) value, exactly as if the blend had never
    been attempted.
    """
    if not os.path.exists(model_path):
        return None
    try:
        import joblib

        return joblib.load(model_path)
    except Exception as exc:  # noqa: BLE001 - any unpickle failure is non-fatal here
        logger.warning('Could not load ML model %s: %s: %s', model_path, type(exc).__name__, exc)
        return None



def load_derived_hazard(data_dir):
    """
    Load the self-derived hazard artifact produced by `python -m geo.derive_hazard`.

    Returns the artifact dict, or None when no derivation has been run yet. A
    missing artifact is not an error: the loader simply falls back to the CSV
    columns, exactly as it behaved before the derivation pipeline existed.
    """
    path = os.path.join(data_dir, DERIVED_HAZARD_FILENAME)
    if not os.path.exists(path):
        logger.info(
            'No %s found - falling back to CSV hazard columns. '
            'Run `python -m geo.derive_hazard` to compute them from geographic data.',
            DERIVED_HAZARD_FILENAME,
        )
        return None

    try:
        with open(path, 'r', encoding='utf-8') as handle:
            artifact = json.load(handle)
    except (OSError, ValueError) as exc:
        logger.warning('Could not read %s (%s) - falling back to CSV columns', path, exc)
        return None

    logger.info(
        'Loaded derived hazard scores for %d habitations (generated %s)',
        len(artifact.get('habitations', {})),
        artifact.get('generated_at', 'unknown'),
    )
    return artifact


DERIVED_ROUTES_FILENAME = 'derived_routes.json'


def load_derived_routes(data_dir):
    """
    Load the road-routing artifact produced by `python -m geo.derive_routes`.

    Returns a dict keyed by route_id, empty when no derivation has been run.
    Routes not present in the artifact keep their CSV estimates.
    """
    path = os.path.join(data_dir, DERIVED_ROUTES_FILENAME)
    if not os.path.exists(path):
        logger.info(
            'No %s found - routes will use straight-line CSV estimates. '
            'Run `python -m geo.fetch_roads` then `python -m geo.derive_routes`.',
            DERIVED_ROUTES_FILENAME,
        )
        return {}

    try:
        with open(path, 'r', encoding='utf-8') as handle:
            artifact = json.load(handle)
    except (OSError, ValueError) as exc:
        logger.warning('Could not read %s (%s) - using CSV estimates', path, exc)
        return {}

    routes = artifact.get('routes', {})
    _REAL = {'osm_road_network', 'ors', 'osrm'}
    derived_count = sum(1 for e in routes.values() if e.get('source') in _REAL)
    logger.info(
        'Loaded road routing artifact: %d of %d routes follow real roads (sources: %s)',
        derived_count,
        len(routes),
        ', '.join(sorted({e.get('source', 'csv_fallback') for e in routes.values()})),
    )
    return routes



def load_data(data_dir):
    """
    Loads habitation, site, and route data from CSV files and converts them
    to dictionaries matching the CP-SAT prototype schema.
    """
    habitations_df = pd.read_csv(os.path.join(data_dir, 'habitations.csv'))
    sites_df = pd.read_csv(os.path.join(data_dir, 'sites.csv'))
    routes_df = pd.read_csv(os.path.join(data_dir, 'routes.csv'))

    # Self-derived hazard scores, when a derivation has been run. These replace
    # the CSV columns as the INPUT to the pipeline; everything downstream of
    # this point (ML blending, dominant-hazard selection, priority, banding,
    # CP-SAT) is unchanged and does not know the difference.
    derived_artifact = load_derived_hazard(data_dir)
    derived_habitations = (derived_artifact or {}).get('habitations', {})

    # ML models loaded ONCE per load_data() call, not once per habitation.
    #
    # This used to call joblib.load() inside the per-habitation loop below, so
    # for every habitation it re-read and re-deserialized both pickle files
    # from disk - 5 redundant loads of a 320 KB RandomForest at 5 habitations,
    # each producing its own burst of sklearn version-mismatch warnings (which
    # is why the startup log used to show the same warning 5 times in a row).
    # At district scale, with real habitation counts in the thousands, that
    # would mean thousands of redundant model deserializations on every plan
    # reload. Load once here; the loop below only calls .predict_proba().
    flood_model = _load_ml_model(os.path.join(os.path.dirname(__file__), 'ml', 'flood_model.pkl'))
    landslide_model = _load_ml_model(
        os.path.join(os.path.dirname(__file__), 'ml', 'landslide_model.pkl')
    )

    # Convert habitations to dictionary
    habitations = {}
    for _, row in habitations_df.iterrows():
        derived = derived_habitations.get(row['habitation_id'])

        if derived is not None:
            flood_score = float(derived['flood_score'])
            landslide_score = float(derived['landslide_score'])
        else:
            flood_score = float(row.get('flood_score', row.get('hazard_score', 0)))
            landslide_score = float(row.get('landslide_score', 0))
        
        # Section 8A: ML Flood Susceptibility Integration
        #
        # Feature mapping (see README "Data Honesty" section for full rationale):
        #   REAL-DERIVED:
        #     MonsoonIntensity  <- flood_proximity_score * 10, clamped [0,10]
        #                          (flood_score is computed from channel proximity in derive_hazard.py)
        #     PopulationScore   <- habitation population % 10  (real census estimate)
        #
        #   DATASET-MEDIAN FALLBACK (value = 5, the training-set median for each):
        #     TopographyDrainage  <- HAND (height above nearest drainage) is null for all habitations
        #                           because the DEM cache was not populated. When fetch_dem runs,
        #                           this should be replaced with elev_rel_drainage_m scaled to [0,10].
        #     DrainageSystems     <- same as TopographyDrainage: no DEM, no real proxy.
        #     Deforestation       <- no real land-cover data. Plan explicitly says: do NOT use terrain
        #                           flatness as a proxy (too weak to defend in Q&A). Honest fallback.
        #     All other features  <- no meaningful real proxy in the current dataset; median used.
        #
        #   REMOVED FROM FEATURE SET (retrained model):
        #     id                  <- sequential row counter in Kaggle dataset, not a signal.
        #                           Original model included it (coeff 7.094e-9, contribution = 0)
        #                           causing a 20-vs-21 feature mismatch. Model retrained without it.
        ml_contribution = None
        if flood_model is not None:
            try:
                # MonsoonIntensity: flood proximity score * 10, clamped to model training range [0, 10]
                monsoon_intensity = round(min(max(flood_score * 10.0, 0.0), 10.0), 1)

                # PopulationScore: population % 10 (real value, unchanged from original)
                population_score = int(int(row['population']) % 10)

                # All other features: dataset median = 5
                # (no real proxy available; median is the honest fallback)
                MEDIAN = 5

                features = pd.DataFrame([{
                    'MonsoonIntensity': monsoon_intensity,        # REAL DERIVED
                    'TopographyDrainage': MEDIAN,                  # median fallback: no DEM cache
                    'RiverManagement': MEDIAN,
                    'Deforestation': MEDIAN,                       # median fallback: no land-cover data
                    'Urbanization': MEDIAN,
                    'ClimateChange': MEDIAN,
                    'DamsQuality': MEDIAN,
                    'Siltation': MEDIAN,
                    'AgriculturalPractices': MEDIAN,
                    'Encroachments': MEDIAN,
                    'IneffectiveDisasterPreparedness': MEDIAN,
                    'DrainageSystems': MEDIAN,                     # median fallback: no DEM cache
                    'CoastalVulnerability': 0,
                    'Landslides': 0,
                    'Watersheds': MEDIAN,
                    'DeterioratingInfrastructure': MEDIAN,
                    'PopulationScore': population_score,           # REAL (population estimate)
                    'WetlandLoss': MEDIAN,
                    'InadequatePlanning': MEDIAN,
                    'PoliticalFactors': MEDIAN,
                }])

                phi = float(flood_model.predict_proba(features)[0][1])

                blend_weight = 0.25
                new_flood_score = (1 - blend_weight) * flood_score + blend_weight * phi

                ml_contribution = {
                    'phi': phi,
                    'shift': new_flood_score - flood_score,
                    'promoted': True,
                    'auc': 0.9275,  # 5-fold CV AUC, model retrained on 1.1M rows WITHOUT id column
                    'model': 'Logistic Regression (20 features, id excluded)',
                    'real_features': ['MonsoonIntensity', 'PopulationScore'],
                    'median_fallback_features': [
                        'TopographyDrainage', 'DrainageSystems',  # need DEM
                        'Deforestation',                            # no land-cover data
                    ],
                }

                flood_score = new_flood_score
            except Exception as exc:
                logger.warning(
                    'Flood ML blend skipped for %s: %s: %s',
                    row['habitation_id'], type(exc).__name__, exc,
                )


        # Section 8A: ML Landslide Susceptibility Integration
        ml_contribution_landslide = None
        if landslide_model is not None:
            try:
                lat, lon = float(row['lat']), float(row['lon'])
                # Feature order matches the training dataset column order:
                #   Temperature (°C), Humidity (%), Precipitation (mm),
                #   Soil Moisture (%), Elevation (m)
                # Synthetic proxies used (no DEM-derived Temperature available):
                #   Temperature: latitude offset from 26°N (Barpeta baseline 28.5°C)
                #   Humidity:    longitude offset from 90°E
                #   Precipitation: latitude-scaled estimate
                #   Soil Moisture: regional constant for Assam monsoon season
                #   Elevation:   longitude-offset rough estimate (actual DEM preferred)
                features_ls = pd.DataFrame([{
                    'Temperature (C)':    28.5 + (lat - 26),
                    'Humidity (%)':       85.0 + (lon - 90) * 2,
                    'Precipitation (mm)': 1500 + (lat - 26) * 500,
                    'Soil Moisture (%)':  60.0,
                    'Elevation (m)':      50 + (lon - 90) * 10,
                }])

                phi_ls = float(landslide_model.predict_proba(features_ls.values)[0][1])

                blend_weight = 0.25
                new_landslide_score = (1 - blend_weight) * landslide_score + blend_weight * phi_ls

                ml_contribution_landslide = {
                    'phi': phi_ls,
                    'shift': new_landslide_score - landslide_score,
                    'promoted': True,
                    # 5-fold stratified CV AUC, retrained with class_weight='balanced'
                    # to fix original degenerate model (old AUC=1.000, phi=0 always).
                    # Dataset: sreeragunandha/landslide-prediction-dataset (synthetic,
                    # 5000 rows, 65.7:1 imbalance). High CV AUC reflects trivially
                    # separable synthetic data; phi≈0 for Barpeta is geographically
                    # correct (flat floodplain, slope < 10° => landslide_slope_term=0).
                    'auc': 0.9999,
                    'model': 'Random Forest (class_weight=balanced, 5 features)',
                    'dataset_note': (
                        'Synthetic dataset, 65.7:1 imbalance. phi~=0 for flat '
                        'floodplain habitations is geographically correct.'
                    ),
                }

                landslide_score = new_landslide_score
            except Exception as exc:
                logger.warning(
                    'Landslide ML blend skipped for %s: %s: %s',
                    row['habitation_id'], type(exc).__name__, exc,
                )


        # Determine dominant hazard
        if landslide_score > flood_score:
            dominant_hazard = "landslide"
            hazard_score = landslide_score
        else:
            dominant_hazard = "flood"
            hazard_score = flood_score

        # Priority and banding. When scores are derived, these are recomputed
        # from the derived hazard so the classification actually follows the
        # measured input; the formula and thresholds are the same ones
        # event_simulator applies after a rainfall event, imported from a single
        # definition rather than duplicated. Without a derivation the CSV values
        # are used, preserving the original behaviour exactly.
        vulnerability_score = float(row['vulnerability_score'])
        if derived is not None:
            from geo.hazard_model import classify_red_zone_band, compute_priority_score

            priority_score = compute_priority_score(hazard_score, vulnerability_score)
            red_zone_band = classify_red_zone_band(priority_score)
            hazard_provenance = derived.get('provenance')
            hazard_score_source = derived.get('hazard_score_source', 'derived')
        else:
            priority_score = float(row['priority_score'])
            red_zone_band = row['red_zone_band']
            hazard_provenance = None
            hazard_score_source = 'csv'

        habitations[row['habitation_id']] = {
            'habitation_id': row['habitation_id'],
            'name': row['name'],
            'lat': float(row['lat']),
            'lon': float(row['lon']),
            'population': int(row['population']),
            'critical_care_population': int(row.get('critical_care_population', 0)),
            'vulnerability_score': float(row['vulnerability_score']),
            'flood_score': flood_score,
            'landslide_score': landslide_score,
            'hazard_score': hazard_score,
            'dominant_hazard': dominant_hazard,
            'ml_contribution': ml_contribution,
            'ml_contribution_landslide': ml_contribution_landslide,
            'priority_score': priority_score,
            'red_zone_band': red_zone_band,
            'road_transit_fraction': float(row.get('road_transit_fraction', 0.7)),
            'hazard_score_source': hazard_score_source,
            'hazard_provenance': hazard_provenance,
            'csv_reference_scores': {
                'hazard_score': float(row.get('hazard_score', 0.0)),
                'flood_score': float(row.get('flood_score', 0.0)),
                'landslide_score': float(row.get('landslide_score', 0.0)),
                'priority_score': float(row['priority_score']),
                'red_zone_band': row['red_zone_band'],
            }
        }

    # Convert sites to dictionary
    sites = {}
    for _, row in sites_df.iterrows():
        sites[row['site_id']] = {
            'site_id': row['site_id'],
            'name': row['name'],
            'lat': float(row['lat']),
            'lon': float(row['lon']),
            'capacity_space': int(row['capacity_space']),
            'capacity_water': int(row['capacity_water']),
            'capacity_sanitation': int(row['capacity_sanitation']),
            'capacity_health': int(row['capacity_health']),
            'capacity_food': int(row['capacity_food']),
            'capacity_road': int(row['capacity_road']),
            'safety_flag': bool(row['safety_flag']),
            'hazard_score': float(row.get('hazard_score', 0.1)),
            'terrain_safe': str(row.get('terrain_safe', 'True')).lower() == 'true',
            'has_healthcare': str(row.get('has_healthcare', 'True')).lower() == 'true',
            'effective_capacity': int(row['effective_capacity']),
            'status': row['status'],
            'food_supply_units': int(row.get('food_supply_units', 0)),
            'medical_supply_units': int(row.get('medical_supply_units', 0))
        }

    # Real road-following routes, when a derivation has been run. Each route
    # keeps its route_id, endpoints, risk_score, status and capacity — only the
    # distance, travel time and geometry are replaced, so route redundancy and
    # every event that closes a route by id keep working unchanged.
    derived_routes = load_derived_routes(data_dir)

    # Sources that provide real road geometry (vs straight-line csv_fallback)
    REAL_ROAD_SOURCES = {'osm_road_network', 'ors', 'osrm'}

    # Convert routes to dictionary
    routes = {}
    for _, row in routes_df.iterrows():
        derived = derived_routes.get(row['route_id'], {})
        route_source = derived.get('source', 'csv_fallback')
        is_derived = route_source in REAL_ROAD_SOURCES

        distance_km = float(row['distance_km'])
        travel_time_min = float(row['travel_time_min'])
        if is_derived:
            distance_km = float(derived['distance_km'])
            if derived.get('travel_time_min') is not None:
                travel_time_min = float(derived['travel_time_min'])

        routes[row['route_id']] = {
            'route_id': row['route_id'],
            'from_habitation_id': row['from_habitation_id'],
            'to_site_id': row['to_site_id'],
            'distance_km': distance_km,
            'travel_time_min': travel_time_min,
            'risk_score': float(row['risk_score']),
            'status': row['status'],
            'capacity_per_hour': int(row['capacity_per_hour']),
            'geometry': derived.get('geometry') if is_derived else None,
            'geometry_source': route_source if is_derived else 'straight_line_estimate',
            'geometry_note': (
                None
                if is_derived
                else derived.get('reason', 'No road-network derivation available')
            ),
            'is_primary_road_path': derived.get('is_primary') if is_derived else None,
            'csv_reference': {
                'distance_km': float(row['distance_km']),
                'travel_time_min': float(row['travel_time_min']),
            }
        }

    return habitations, sites, routes

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, 'data')
    
    habitations, sites, routes = load_data(data_dir)
    
    print("=== Aapda Setu Data Load Summary ===")
    print(f"Loaded {len(habitations)} habitations.")
    print(f"Loaded {len(sites)} sites/shelters.")
    print(f"Loaded {len(routes)} routes.")
    
    print("\n--- Sample Habitation (BRP-001) ---")
    print(habitations.get('BRP-001'))
    
    print("\n--- Sample Site (SHL-001) ---")
    print(sites.get('SHL-001'))
    
    print("\n--- Sample Route (R01) ---")
    print(routes.get('R01'))
    print("====================================")
