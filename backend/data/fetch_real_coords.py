import urllib.request
import urllib.parse
import json
import csv

habitations = ["Ambari", "Howly", "Fulkipara", "Baghbar", "Kalgachia"]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

def get_coords(place):
    query = f"{place}, Barpeta, Assam, India"
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    
    # Fallback to general Barpeta queries if specific town not found
    query2 = f"{place}, Assam, India"
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query2)}&format=json&limit=1"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
        
    return None, None

def update_habitations():
    # Read existing
    rows = []
    with open('data/habitations.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
            
    # Modify
    fieldnames = list(rows[0].keys())
    if 'data_source' not in fieldnames:
        fieldnames.extend(['data_source', 'notes'])

    # Map our new names to existing BRP rows
    mapping = dict(zip(['BRP-001', 'BRP-002', 'BRP-003', 'BRP-004', 'BRP-005'], habitations))
    
    for row in rows:
        hid = row['habitation_id']
        name = mapping.get(hid, row['name'])
        row['name'] = name
        
        lat, lon = get_coords(name)
        if lat is None:
            # Fallback approximate coordinates in Barpeta
            lat, lon = float(row['lat']), float(row['lon'])
            
        row['lat'] = lat
        row['lon'] = lon
        row['data_source'] = "estimated"
        row['notes'] = "Coords from OpenStreetMap/approximated. Population/scores estimated."

    # Write back
    with open('data/habitations.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    print("Updating habitations.csv...")
    update_habitations()
    print("Done.")
