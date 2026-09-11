import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Distinct Site icon (shield)
const createSiteIcon = () => {
  // A distinct shield path, definitely not a house
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 8.9-7 10-3.87-1.1-7-5.33-7-10V6.3l7-3.12z"/>
    <path d="M12 14.5l-3.5-3.5h7z"/>
  </svg>`;
  return L.divIcon({
    className: 'site-marker',
    html: svg,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12]
  });
};

// Habitation pulse icon
const createHabIcon = (band) => {
  let color = '#95a5a6';
  let pulseClass = 'pulse-low';
  
  if (band === 'critical') { color = '#ef4444'; pulseClass = 'pulse-critical'; }
  else if (band === 'high') { color = '#f97316'; pulseClass = 'pulse-high'; }
  else if (band === 'moderate') { color = '#f59e0b'; pulseClass = 'pulse-moderate'; }
  else if (band === 'low') { color = '#10b981'; pulseClass = 'pulse-low'; }

  const html = `
    <div class="hab-marker ${pulseClass}">
      <div class="ring" style="border: 3px solid ${color}; background-color: ${color}50; box-shadow: 0 0 12px ${color};"></div>
      <div class="dot" style="background-color: ${color}; box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.8);"></div>
    </div>
  `;
  return L.divIcon({
    className: 'transparent-leaflet-icon',
    html: html,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

const MapView = ({ habitations, sites, currentPlan, routesData, selectedHab, onHabClick, theme }) => {

  const createHabIconWithUnmet = (hab) => {
    let color = '#95a5a6';
    let pulseClass = 'pulse-low';
    const band = hab.red_zone_band;
    
    if (band === 'critical') { color = '#ef4444'; pulseClass = 'pulse-critical'; }
    else if (band === 'high') { color = '#f97316'; pulseClass = 'pulse-high'; }
    else if (band === 'moderate') { color = '#f59e0b'; pulseClass = 'pulse-moderate'; }
    else if (band === 'low') { color = '#10b981'; pulseClass = 'pulse-low'; }
    
    const unmet = currentPlan?.unmet_demand?.[hab.habitation_id] || 0;
    const unmetIndicator = unmet > 0 
      ? `<div class="unmet-warning-ring"></div><div class="unmet-warning-icon">⚠</div>`
      : '';

    const html = `
      <div class="hab-marker ${pulseClass}">
        ${unmetIndicator}
        <div class="ring" style="border: 3px solid ${color}; background-color: ${color}50; box-shadow: 0 0 12px ${color};"></div>
        <div class="dot" style="background-color: ${color}; box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.8);"></div>
      </div>
    `;
    return L.divIcon({
      className: 'transparent-leaflet-icon',
      html: html,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };

  const getGradientId = (band) => {
    switch(band) {
      case 'critical': return 'grad-critical';
      case 'high': return 'grad-high';
      case 'moderate': return 'grad-moderate';
      case 'low': return 'grad-low';
      default: return 'grad-low';
    }
  };

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <>
      {/* Invisible SVG to define gradients for Leaflet paths */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="grad-critical" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="grad-high" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="grad-moderate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="grad-low" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>

      <MapContainer 
        center={[26.32, 91.0]} 
        zoom={13} 
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <TileLayer
          key={theme} // Force re-render of tiles on theme change
          attribution={attribution}
          url={tileUrl}
        />

        {/* Sites */}
        {Object.values(sites).map(site => (
          <Marker 
            key={site.name} 
            position={[site.lat, site.lon]}
            icon={createSiteIcon()}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', color: 'black' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>{site.name}</strong>
                <div>Capacity: {site.effective_capacity}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Habitations */}
        {Object.values(habitations).map(hab => (
          <Marker 
            key={hab.habitation_id} 
            position={[hab.lat, hab.lon]}
            icon={createHabIconWithUnmet(hab)}
            eventHandlers={{ click: () => onHabClick(hab.habitation_id) }}
          />
        ))}

        {/* Assignment Lines */}
        {currentPlan && currentPlan.assignments && currentPlan.assignments.map((a, i) => {
          const hab = habitations[a.habitation_id];
          const site = sites[a.site_id];
          
          if (!hab || !site) return null;

          const positions = [
            [hab.lat, hab.lon],
            [site.lat, site.lon]
          ];

          // Bucket line thickness based on people count
          let weight = 2; // < 500
          if (a.people_count >= 1500) weight = 6;
          else if (a.people_count >= 500) weight = 4;

          const route = routesData && routesData[a.route_id];

          return (
            <Polyline 
              key={`line-${a.habitation_id}-${a.site_id}`}
              positions={positions} 
              className="assignment-line"
              pathOptions={{ 
                color: `url(#${getGradientId(hab.red_zone_band)})`, 
                weight: weight, 
                dashArray: '10, 10' 
              }} 
            >
              <Tooltip sticky>
                <div style={{ fontFamily: 'Inter, sans-serif' }}>
                  <strong>{a.people_count} people</strong> → {site.name}
                  {route && <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{route.travel_time_min} mins travel time</div>}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>
    </>
  );
};

export default MapView;
