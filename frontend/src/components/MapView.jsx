import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ListFilter, X } from 'lucide-react';

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

const bandColor = (band) => {
  if (band === 'critical') return '#ef4444';
  if (band === 'high') return '#f97316';
  if (band === 'moderate') return '#f59e0b';
  if (band === 'low') return '#10b981';
  return '#95a5a6';
};

const bandPulseClass = (band) => {
  if (band === 'critical') return 'pulse-critical';
  if (band === 'high') return 'pulse-high';
  if (band === 'moderate') return 'pulse-moderate';
  return 'pulse-low';
};

const getGradientId = (band) => {
  switch (band) {
    case 'critical': return 'grad-critical';
    case 'high': return 'grad-high';
    case 'moderate': return 'grad-moderate';
    case 'low': return 'grad-low';
    default: return 'grad-low';
  }
};

// Any Leaflet layer with the default bubblingMouseEvents:true will let a
// click bubble up to the map's own click handler. The map's click handler is
// what returns the view to overview mode ("clicking the map background /
// empty space"), so every marker and line needs to stop that bubbling
// explicitly - otherwise focusing a habitation and immediately un-focusing it
// would happen in the same click.
const stopBubble = (e) => L.DomEvent.stopPropagation(e);

/** Invisible helper that listens for genuine map-background clicks. */
function ClickToClearFocus({ onClear }) {
  useMapEvents({ click: () => onClear() });
  return null;
}

/**
 * One habitation-to-site route: the line plus its focused-only chip.
 *
 * Split out as its own component for one specific reason: react-leaflet's
 * Polyline reapplies `pathOptions` (colour/width/opacity/dash) via Leaflet's
 * setStyle() on every prop change, but it only ever applies the `className`
 * prop ONCE, at mount - confirmed by inspecting the rendered SVG directly,
 * where stroke-opacity/width/colour all updated correctly on focus changes
 * while the `class` attribute stayed frozen at whatever it was on first
 * render. A ref + effect that toggles the modifier class imperatively on the
 * underlying DOM node sidesteps that gap without touching Leaflet's own
 * rendering path.
 */
function AssignmentRoute({ assignment: a, hab, site, route, isFocused, isOverview }) {
  const polylineRef = React.useRef(null);

  React.useEffect(() => {
    const layer = polylineRef.current;
    const el = layer && layer.getElement && layer.getElement();
    if (!el) return;
    el.classList.toggle('assignment-line--focused', isFocused);
    el.classList.toggle('assignment-line--dim', !isFocused);
  }, [isFocused]);

  const REAL_ROAD_SOURCES = new Set(['osm_road_network', 'osrm', 'ors']);
  const hasRoadGeometry =
    route &&
    REAL_ROAD_SOURCES.has(route.geometry_source) &&
    Array.isArray(route.geometry) &&
    route.geometry.length >= 2;

  const positions = hasRoadGeometry
    ? route.geometry
    : [
        [hab.lat, hab.lon],
        [site.lat, site.lon]
      ];

  const midpoint = positions[Math.floor(positions.length / 2)];
  const midLat = midpoint[0];
  const midLon = midpoint[1];

  let focusedWeight = 2;
  if (a.people_count >= 1500) focusedWeight = 6;
  else if (a.people_count >= 500) focusedWeight = 4;

  const pathOptions = isFocused
    ? {
        color: `url(#${getGradientId(hab.red_zone_band)})`,
        weight: focusedWeight,
        opacity: 0.85,
        dashArray: hasRoadGeometry ? null : '10, 10',
        lineJoin: 'round',
        lineCap: 'round',
      }
    : {
        color: '#94a3b8',
        weight: 1.5,
        opacity: isOverview ? 0.4 : 0.15,
        dashArray: '3, 7',
        lineJoin: 'round',
        lineCap: 'round',
      };

  return (
    <>
      <Polyline
        ref={polylineRef}
        positions={positions}
        className={`assignment-line ${isFocused ? 'assignment-line--focused' : 'assignment-line--dim'}`}
        pathOptions={pathOptions}
        eventHandlers={{ click: stopBubble }}
      >
        <Tooltip sticky>
          <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <strong>{a.people_count} people</strong> -{'>'} {site.name}
            {route && (
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {route.distance_km} km &middot; {route.travel_time_min} mins travel time
              </div>
            )}
            <div style={{ fontSize: '10px', color: hasRoadGeometry ? '#16a34a' : '#b45309', marginTop: '3px' }}>
              {hasRoadGeometry
                ? `Real road path (${route.geometry_source.toUpperCase()})`
                : 'Straight-line estimate - road network not derived'}
            </div>
          </div>
        </Tooltip>
      </Polyline>
      {/* Permanent route_id chip: focused route only. This is the "label"
          the decluttering pattern removes in overview mode - the hover
          tooltip above still works on every line either way, so detail is
          never more than a hover away. */}
      {isFocused && (
        <Marker
          position={[midLat, midLon]}
          icon={L.divIcon({
            className: 'transparent-leaflet-icon',
            html: `<div class="route-chip-icon route-chip-icon--focused">${a.route_id}</div>`,
            iconSize: [30, 14],
            iconAnchor: [15, 7]
          })}
          eventHandlers={{ click: stopBubble }}
        />
      )}
    </>
  );
}

const MapView = ({ habitations, sites, currentPlan, routesData, selectedHab, onHabClick, theme }) => {
  // Which habitation's route is in focus. null = overview mode (every route
  // rendered thin/dim/uniform). Internal to MapView on purpose: this map is
  // shared across Dashboard, Plan Health, What-If and Field Report, and only
  // Dashboard wires a real selectedHab/onHabClick pair through to an
  // explainability panel - the other three pass a permanent null/no-op. Route
  // focus needs to work identically on all four regardless, so it lives here
  // rather than depending on what each page happens to pass in.
  const [focusedHabId, setFocusedHabId] = useState(null);

  // One-directional sync: when the HOST page's own selection changes (e.g.
  // Dashboard's sidebar, or closing the explainability panel back to null),
  // the map's focus follows it. Internal focus changes (the dropdown below,
  // or clicking a marker) never write back to this prop, so there is no
  // feedback loop - only external changes flow in.
  useEffect(() => {
    setFocusedHabId(selectedHab || null);
  }, [selectedHab]);

  const focusHabitation = (habId) => setFocusedHabId(habId || null);
  const clearFocus = () => setFocusedHabId(null);

  const createHabIconWithUnmet = (hab, isFocused) => {
    const color = bandColor(hab.red_zone_band);
    const pulseClass = bandPulseClass(hab.red_zone_band);

    const unmet = currentPlan?.unmet_demand?.[hab.habitation_id] || 0;
    const unmetIndicator = unmet > 0
      ? `<div class="unmet-warning-ring"></div><div class="unmet-warning-icon">⚠️</div>`
      : '';

    const hazardIcon = hab.dominant_hazard === 'landslide' ? '⛰️' : '🌊';
    const hazardOverlay = `<div class="hazard-overlay" style="position:absolute; top:-10px; right:-10px; font-size:14px; z-index:100; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${hazardIcon}</div>`;

    // Focus ring: a wider, slower-pulsing halo layered behind the marker's
    // own hazard-band ring, so the currently-focused habitation reads as
    // "selected" even before you look at which route is lit up.
    const focusRing = isFocused
      ? `<div class="focus-ring"></div>`
      : '';

    const html = `
      <div class="hab-marker ${pulseClass} ${isFocused ? 'is-focused' : ''}" style="position:relative;">
        ${focusRing}
        ${unmetIndicator}
        ${hazardOverlay}
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

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const habitationOptions = Object.values(habitations).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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

      {/* Route focus selector. Bottom-center by choice: Leaflet's own zoom
          control already owns top-left. Every page that embeds this map
          floats its own chrome near the top (KPI strip, solver badge,
          toasts), and Dashboard specifically also runs full-height side
          panels edge-to-edge on BOTH left (sidebar) and right (explainability
          panel) - the map is a full-bleed background there, so "bottom-left"
          or "bottom-right" of the map is the same screen region as those
          panels, not clear of them. Centred along the bottom is the one
          position that stays clear of the side panels on Dashboard and of
          everything else on the other three pages. */}
      <div
        className="map-route-selector"
        style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
          padding: '8px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxWidth: 'min(400px, calc(100% - 32px))',
        }}
      >
        <ListFilter size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
        <select
          value={focusedHabId || ''}
          onChange={(e) => focusHabitation(e.target.value || null)}
          style={{
            background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 12.5,
            fontWeight: 600, outline: 'none', cursor: 'pointer', minWidth: 0, flex: 1,
          }}
        >
          <option value="" style={{ background: '#0f172a' }}>Overview (all routes)</option>
          {habitationOptions.map(hab => (
            <option key={hab.habitation_id} value={hab.habitation_id} style={{ background: '#0f172a' }}>
              {hab.name} - {hab.habitation_id}
            </option>
          ))}
        </select>
        {focusedHabId && (
          <button
            onClick={clearFocus}
            title="Clear selection - back to overview"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 8, padding: '4px 8px', color: '#38bdf8', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      <MapContainer
        center={[26.32, 90.95]}
        zoom={11}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <TileLayer
          key={theme} // Force re-render of tiles on theme change
          attribution={attribution}
          url={tileUrl}
        />

        <ClickToClearFocus onClear={clearFocus} />

        {/* Sites */}
        {Object.values(sites).map(site => (
          <Marker
            key={site.site_id}
            position={[site.lat, site.lon]}
            icon={createSiteIcon()}
            eventHandlers={{ click: stopBubble }}
          >
            <Tooltip permanent direction="bottom" offset={[0, 12]} className="map-id-label site-label">
              {site.site_id}
            </Tooltip>
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
            icon={createHabIconWithUnmet(hab, hab.habitation_id === focusedHabId)}
            eventHandlers={{
              click: (e) => {
                stopBubble(e);
                onHabClick(hab.habitation_id);
                focusHabitation(hab.habitation_id);
              }
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -15]} className="map-id-label hab-label">
              {hab.habitation_id}
            </Tooltip>
          </Marker>
        ))}

        {/* Assignment Lines */}
        {currentPlan && currentPlan.assignments && currentPlan.assignments.map((a) => {
          const hab = habitations[a.habitation_id];
          const site = sites[a.site_id];

          if (!hab || !site) return null;

          const route = routesData && routesData[a.route_id];
          const isOverview = focusedHabId === null;
          const isFocused = a.habitation_id === focusedHabId;

          return (
            <AssignmentRoute
              key={`frag-${a.habitation_id}-${a.site_id}-${a.route_id}`}
              assignment={a}
              hab={hab}
              site={site}
              route={route}
              isFocused={isFocused}
              isOverview={isOverview}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
