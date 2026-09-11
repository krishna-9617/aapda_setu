import csv

schools = [
    {"name": "Barpeta Vidyapith", "lat": 26.321, "lon": 91.005},
    {"name": "Madhab Choudhury College", "lat": 26.325, "lon": 91.010},
    {"name": "Tarun Ram Phookan High School", "lat": 26.315, "lon": 91.000},
    {"name": "Barpeta Girls High School", "lat": 26.330, "lon": 90.990},
    {"name": "J.R.P. Female Seminary", "lat": 26.310, "lon": 91.015},
]

def update_sites():
    rows = []
    with open('data/sites.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
            
    fieldnames = list(rows[0].keys())
    if 'data_source' not in fieldnames:
        fieldnames.extend(['data_source', 'notes'])

    for idx, row in enumerate(rows):
        if idx < len(schools):
            row['name'] = schools[idx]['name']
            row['lat'] = schools[idx]['lat']
            row['lon'] = schools[idx]['lon']
            
        row['data_source'] = "estimated"
        row['notes'] = "Real institution name, coords approximate. Capacities estimated."

    with open('data/sites.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    print("Updating sites.csv...")
    update_sites()
    print("Done.")
