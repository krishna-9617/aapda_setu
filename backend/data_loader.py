import pandas as pd
import os

def load_data(data_dir):
    """
    Loads habitation, site, and route data from CSV files and converts them
    to dictionaries matching the CP-SAT prototype schema.
    """
    habitations_df = pd.read_csv(os.path.join(data_dir, 'habitations.csv'))
    sites_df = pd.read_csv(os.path.join(data_dir, 'sites.csv'))
    routes_df = pd.read_csv(os.path.join(data_dir, 'routes.csv'))

    # Convert habitations to dictionary
    habitations = {}
    for _, row in habitations_df.iterrows():
        flood_score = float(row.get('flood_score', row.get('hazard_score', 0)))
        landslide_score = float(row.get('landslide_score', 0))
        
        # Determine dominant hazard
        if landslide_score > flood_score:
            dominant_hazard = "landslide"
            hazard_score = landslide_score
        else:
            dominant_hazard = "flood"
            hazard_score = flood_score
            
        habitations[row['habitation_id']] = {
            'habitation_id': row['habitation_id'],
            'name': row['name'],
            'lat': float(row['lat']),
            'lon': float(row['lon']),
            'population': int(row['population']),
            'vulnerability_score': float(row['vulnerability_score']),
            'flood_score': flood_score,
            'landslide_score': landslide_score,
            'hazard_score': hazard_score,
            'dominant_hazard': dominant_hazard,
            'priority_score': float(row['priority_score']),
            'red_zone_band': row['red_zone_band'],
            'road_transit_fraction': float(row.get('road_transit_fraction', 0.7))
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
            'effective_capacity': int(row['effective_capacity']),
            'status': row['status'],
            'food_supply_units': int(row.get('food_supply_units', 0)),
            'medical_supply_units': int(row.get('medical_supply_units', 0))
        }

    # Convert routes to dictionary
    routes = {}
    for _, row in routes_df.iterrows():
        routes[row['route_id']] = {
            'route_id': row['route_id'],
            'from_habitation_id': row['from_habitation_id'],
            'to_site_id': row['to_site_id'],
            'distance_km': float(row['distance_km']),
            'travel_time_min': float(row['travel_time_min']),
            'risk_score': float(row['risk_score']),
            'status': row['status'],
            'capacity_per_hour': int(row['capacity_per_hour'])
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
