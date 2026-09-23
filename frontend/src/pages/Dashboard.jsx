import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  ListOrdered, PanelLeftClose, PanelLeftOpen, Users, TrendingDown,
  Gauge, ArrowRight, Info,
} from 'lucide-react';

import MapView from '../components/MapView';
import SolverStatusBadge from '../components/SolverStatusBadge';
import { NumberTicker } from '../components/ui/number-ticker';
import { API_BASE_URL } from '../config';

// Tilt card component for 3D effect
const TiltCard = ({ children, style, className }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateXValue = ((y - centerY) / centerY) * -5; // Max 5 deg tilt
    const rotateYValue = ((x - centerX) / centerX) * 5;  // Max 5 deg tilt

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={className}
      style={{
        perspective: 1200,
        transformStyle: 'preserve-3d',
        backgroundColor: 'var(--panel-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 8px 32px var(--shadow-light)',
        borderRadius: '16px',
        ...style
      }}
    >
      {children}
    </motion.div>
  );
};

const Legend = () => (
  <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--inner-bg)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
    <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Legend</h5>
    {[
      { label: 'Critical Priority', color: '#ef4444' },
      { label: 'High Priority', color: '#f97316' },
      { label: 'Moderate Priority', color: '#f59e0b' },
      { label: 'Low Priority', color: '#10b981' },
      { label: 'Shelter Site', color: '#3b82f6' }
    ].map(item => (
      <div key={item.label} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}`, marginRight: '10px' }}></div>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.label}</span>
      </div>
    ))}
  </div>
);


// Animated radial gauge for ML susceptibility scores
const RadialGauge = ({ value, color, size = 56 }) => {
  const r = (size / 2) - 5;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(1, value));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
};

const ExplainabilityPanelContent = ({ habitationId, habitations, sites, currentPlan, routesData, onClose }) => {
  if (!habitationId || !currentPlan || !habitations[habitationId]) return null;
  const hab = habitations[habitationId];
  const assignment = currentPlan.assignments.find(a => a.habitation_id === habitationId);
  const unmet = currentPlan.unmet_demand[habitationId] || 0;
  
  const bandColor = hab.red_zone_band === 'critical' ? '#ef4444' : 
                    hab.red_zone_band === 'high' ? '#f97316' :
                    hab.red_zone_band === 'moderate' ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'linear-gradient(to right, rgba(255,255,255,0.05), transparent)', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', outline: 'none' }}
        >×</button>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-light)', paddingRight: '20px' }}>{hab.name}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Habitation Details</p>
        {hab.data_source && (
          <div style={{ marginTop: '8px', display: 'inline-block', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: 'var(--ink-sky)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Source: {hab.data_source === 'estimated' ? 'DEMO / ESTIMATED' : hab.data_source}
          </div>
        )}
      </div>

      <div style={{ padding: '24px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'var(--inner-bg)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>Population</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong)', marginTop: '4px' }}>{hab.population}</div>
          </div>
          <div style={{ backgroundColor: 'var(--inner-bg)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>Priority Zone</div>
            <div style={{ 
              marginTop: '4px', display: 'inline-block',
              backgroundColor: `rgba(${bandColor === '#ef4444' ? '239,68,68' : bandColor === '#f97316' ? '249,115,22' : bandColor === '#f59e0b' ? '245,158,11' : '16,185,129'}, 0.2)`,
              color: bandColor, border: `1px solid rgba(${bandColor === '#ef4444' ? '239,68,68' : bandColor === '#f97316' ? '249,115,22' : bandColor === '#f59e0b' ? '245,158,11' : '16,185,129'}, 0.3)`,
              padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>{hab.red_zone_band}</div>
          </div>
        </div>

        {hab.classification_stability !== undefined && (
          <div style={{ marginBottom: '16px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
            Classification stable in {(hab.classification_stability * 100).toFixed(1)}% of weight-perturbation runs.
          </div>
        )}

        <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'var(--inner-bg)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{hab.dominant_hazard === 'landslide' ? '⛰️' : '🌊'}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>Primary Hazard</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'capitalize' }}>{hab.dominant_hazard || 'Flood'}</span>
          </div>
        </div>

        {hab.ml_contribution?.promoted && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flexShrink: 0, position: 'relative', filter: 'drop-shadow(0 4px 8px rgba(56,189,248,0.25))' }}>
              <RadialGauge value={hab.ml_contribution.phi} color="#38bdf8" size={52} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--ink-sky)' }}>
                {Math.round(hab.ml_contribution.phi * 100)}%
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--ink-sky)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Flood Susceptibility</h4>
              <div style={{ fontSize: '12px', color: 'var(--text-strong)', marginBottom: '4px' }}>
                {hab.ml_contribution.model}, AUC {hab.ml_contribution.auc}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Dataset: naiyakhalid/flood-prediction-dataset (1.1M rows)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' }}>
                <span style={{ color: 'var(--ink-sky)', fontWeight: 600 }}>Real-derived:</span> MonsoonIntensity (flood proximity × 10), PopulationScore
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px', fontStyle: 'italic' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Median fallback (5/10):</span> TopographyDrainage, DrainageSystems (need DEM), Deforestation (no land-cover data), and 15 others — honest substitution, not fabricated.
              </div>
            </div>
          </div>
        )}


        {hab.ml_contribution_landslide?.promoted && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flexShrink: 0, position: 'relative', filter: 'drop-shadow(0 4px 8px rgba(245,158,11,0.25))' }}>
              <RadialGauge value={hab.ml_contribution_landslide.phi} color="#f59e0b" size={52} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--ink-amber)' }}>
                {Math.round(hab.ml_contribution_landslide.phi * 100)}%
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--ink-amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Landslide Susceptibility</h4>
              <div style={{ fontSize: '12px', color: 'var(--text-strong)', marginBottom: '4px' }}>
                {hab.ml_contribution_landslide.model}, AUC {hab.ml_contribution_landslide.auc}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Dataset: sreeragunandha/landslide-prediction-dataset
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', fontStyle: 'italic' }}>
                *Habitation features are estimated proxies, not directly measured.
              </div>
            </div>
          </div>
        )}

        {hab.critical_care_population > 0 && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '15px', width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: 'radial-gradient(circle at 32% 28%, rgba(248,113,113,0.5), rgba(239,68,68,0.1) 65%, transparent 100%)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}>🏥</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-red-400)', fontWeight: 600, letterSpacing: '0.5px' }}>Critical Care Population</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-red-300)' }}>{hab.critical_care_population} people (bedridden / oxygen / maternal)</span>
            </div>
          </div>
        )}

        {currentPlan?.filtering_reasons && currentPlan.filtering_reasons[habitationId] && currentPlan.filtering_reasons[habitationId].length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }}></span>
              Filtered Candidate Sites
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentPlan.filtering_reasons[habitationId].map((reason, idx) => (
                <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '12px', color: 'var(--text-light)', lineHeight: '1.4' }}>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
          Current Assignment
        </h4>

        {assignment ? (
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Phase:</span>
              <strong style={{ color: 'var(--ink-sky)', fontSize: '13px' }}>Immediate Relocation</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Site:</span>
              <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{sites[assignment.site_id]?.name || assignment.site_id}</strong>
            </div>
            {hab.critical_care_population > 0 && sites[assignment.site_id]?.has_healthcare && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '12px' }}>✅</span>
                <span style={{ color: 'var(--ink-emerald-400)', fontSize: '12px', fontWeight: 600 }}>Assigned to healthcare-capable shelter</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Route:</span>
              <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{assignment.route_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Assigned:</span>
              <strong style={{ color: 'var(--ink-emerald-500)', fontSize: '13px' }}>{assignment.people_count} people</strong>
            </div>
            {(assignment.buses_required !== undefined || assignment.boats_required !== undefined) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fleet Needed:</span>
                <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                  🚌 {assignment.buses_required || 0} buses, 🛶 {assignment.boats_required || 0} boats
                </strong>
              </div>
            )}
            {routesData && routesData[assignment.route_id] && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Travel Time:</span>
                <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{routesData[assignment.route_id].travel_time_min} mins</strong>
              </div>
            )}
            
            {(() => {
              const siteAssignments = currentPlan.assignments.filter(a => a.site_id === assignment.site_id);
              const totalAssignedToSite = siteAssignments.reduce((acc, a) => acc + a.people_count, 0);
              const site = sites[assignment.site_id];
              const foodUsed = totalAssignedToSite * 3;
              const foodTotal = site?.food_supply_units || 0;
              const medicalUsed = Math.ceil(totalAssignedToSite / 20);
              const medicalTotal = site?.medical_supply_units || 0;
              
              return (
                <div style={{ marginBottom: unmet > 0 ? '12px' : '0', borderBottom: unmet > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: unmet > 0 ? '12px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Food:</span>
                    <strong style={{ color: foodUsed >= foodTotal ? '#ef4444' : '#10b981', fontSize: '13px' }}>{foodUsed} / {foodTotal} units</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Medical:</span>
                    <strong style={{ color: medicalUsed >= medicalTotal ? '#ef4444' : '#10b981', fontSize: '13px' }}>{medicalUsed} / {medicalTotal} kits</strong>
                  </div>
                </div>
              );
            })()}

            {unmet > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unmet Demand:</span>
                <strong style={{ color: 'var(--ink-red-500)', fontSize: '13px' }}>{unmet} people</strong>
              </div>
            )}
            <p style={{ margin: '16px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5, fontStyle: 'italic' }}>
              Assigned by CP-SAT solver prioritizing shortest travel time while respecting exact space, food, and medical capacity limits.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: 'var(--ink-red-300)', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              No viable route or capacity available. All <strong>{unmet}</strong> people are unassigned (Unmet Demand).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Sidebar sections. Splitting the old single scrolling stack (queue, health
// banner, event controls, legend, nav links all always visible) into chosen
// panels is the main structural change here: one task visible at a time
// instead of scroll-to-find.
const SIDEBAR_TABS = [
  { id: 'queue', label: 'Queue', icon: ListOrdered },
  { id: 'more', label: 'More', icon: Info },
];

/** Small floating stat block for the KPI strip. Presentational only. */
/**
 * One Priority Queue row, with a mouse-tracked 3D tilt layered onto the
 * existing selection/pulse behaviour (added inline here, rather than via the
 * shared Tilt3D wrapper, because this card already carries its own
 * `variants`/`animate`/`whileHover` for the stagger entrance and the
 * hasChanged pulse - restructuring it into Tilt3D's nesting would have meant
 * re-plumbing all three around a new wrapper for no real benefit over just
 * adding two more motion values to the element that already exists).
 */
function PriorityQueueCard({ hab, isSelected, hasChanged, bandColor, unmet, onSelect }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 250, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 250, damping: 22 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 6);
    rotateX.set(py * -6);
  };
  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const bandRgb = bandColor === '#ef4444' ? '239, 68, 68' : bandColor === '#f97316' ? '249, 115, 22' : bandColor === '#f59e0b' ? '245, 158, 11' : '16, 185, 129';

  return (
    <div style={{ perspective: 700 }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 }
        }}
        animate={hasChanged ? {
          boxShadow: ['0 0 0px rgba(0,0,0,0)', `0 0 20px ${bandColor}`, '0 0 0px rgba(0,0,0,0)'],
          borderColor: ['var(--item-border)', bandColor, 'var(--item-border)']
        } : "visible"}
        transition={hasChanged ? { duration: 1.5, repeat: 3 } : {}}
        whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onSelect}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
          padding: '12px 16px',
          border: `1px solid ${isSelected ? 'rgba(56, 189, 248, 0.5)' : 'var(--item-border)'}`,
          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--item-bg)',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          transition: 'background-color 0.2s, border-color 0.2s'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: isSelected ? '#38bdf8' : 'var(--text-strong)' }}>{hab.name}</div>
            <span title={hab.dominant_hazard === 'landslide' ? 'Landslide Risk' : 'Flood Risk'} style={{ fontSize: '12px' }}>
              {hab.dominant_hazard === 'landslide' ? '⛰️' : '🌊'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Pop: <strong style={{ color: 'var(--text-tertiary)' }}>{hab.population}</strong></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{
            backgroundColor: `rgba(${bandRgb}, 0.2)`,
            color: bandColor,
            border: `1px solid rgba(${bandRgb}, 0.3)`,
            fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {hab.red_zone_band}
          </div>
          {unmet > 0 && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--ink-amber)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              Unmet: {unmet}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}


const KpiStat = ({ icon: Icon, label, value, decimalPlaces = 0, tint, suffix = '' }) => (
  <div className="flex items-center gap-2.5 px-3">
    <Icon size={15} style={{ color: tint }} />
    <div>
      <div className="as-numeric text-base font-bold leading-none" style={{ color: tint }}>
        <NumberTicker value={value} decimalPlaces={decimalPlaces} />{suffix}
      </div>
      <div className="as-small text-[var(--as-text-tertiary)] mt-0.5 leading-none">{label}</div>
    </div>
  </div>
);

const Dashboard = ({ theme }) => {
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedHab, setSelectedHab] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [planHistory, setPlanHistory] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // Which sidebar section is showing. Purely presentational - new in this
  // redesign - nothing downstream depends on it.
  const [sidebarTab, setSidebarTab] = useState('queue');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.leaflet-marker-icon')) return;
      if (e.target.closest('.sidebar-container')) return;
      if (e.target.closest('.explainability-panel')) return;
      if (e.target.closest('.solver-badge')) return;
      if (e.target.closest('.hamburger-btn')) return;
      if (e.target.closest('.theme-toggle-btn')) return;
      if (e.target.closest('.approval-modal')) return;

      setSelectedHab(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentPlan) {
      fetch(`${API_BASE_URL}/plans/health`).then(r => r.json()).then(d => setHealthStatus(d.status)).catch(console.error);
    }
  }, [currentPlan]);

  const fetchCurrentData = async () => {
    try {
      let planRes = await fetch(`${API_BASE_URL}/plans/current`);
      if (!planRes.ok) {
        planRes = await fetch(`${API_BASE_URL}/plans/optimize`, { method: 'POST' });
      }

      const [habsRes, sitesRes, routesRes, historyRes, auditRes] = await Promise.all([
        fetch(`${API_BASE_URL}/habitations`),
        fetch(`${API_BASE_URL}/sites`),
        fetch(`${API_BASE_URL}/routes`),
        fetch(`${API_BASE_URL}/plans/history`),
        fetch(`${API_BASE_URL}/audit-log`)
      ]);

      setCurrentPlan(await planRes.json());
      setHabitations(await habsRes.json());
      setSites(await sitesRes.json());
      setRoutesData(await routesRes.json());
      setPlanHistory(await historyRes.json());
      setAuditLog(await auditRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchCurrentData();
  }, []);

  const sortedHabs = Object.values(habitations).sort((a, b) => b.priority_score - a.priority_score);

  // KPI strip figures. Derived from state already fetched above - no new
  // network calls, purely a different presentation of the same data.
  const totalPopulation = Object.values(habitations).reduce((sum, h) => sum + (h.population || 0), 0);
  const totalUnmet = Object.values(currentPlan?.unmet_demand || {}).reduce((sum, v) => sum + v, 0);
  const objectiveValue = currentPlan?.objective ?? 0;

  return (
    <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)', backgroundImage: 'var(--bg-grad)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>

      {/* BACKGROUND MAP LAYER */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        perspective: '1200px',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          width: '100%', height: '100%',
          transform: 'rotateX(4.5deg) translateY(-1%) scale(1.03)',
          transformStyle: 'preserve-3d',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg)'
        }}>
          <MapView
            habitations={habitations}
            sites={sites}
            currentPlan={currentPlan}
            routesData={routesData}
            selectedHab={selectedHab}
            onHabClick={setSelectedHab}
            theme={theme}
          />
        </div>
      </div>

      {/* FOREGROUND UI LAYER */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', height: '100%', pointerEvents: 'none', padding: '16px', gap: '16px' }}>

        {/* Sidebar collapse/expand toggle - always visible regardless of
            sidebar state, reachable in the same top-left corner either way. */}
        <button
          onClick={() => setIsSidebarOpen(v => !v)}
          className="hamburger-btn"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            position: 'absolute', top: 100, left: 0, zIndex: 20, pointerEvents: 'auto',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--panel-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--panel-border)', borderRadius: '12px', color: 'var(--text-light)',
            cursor: 'pointer',
          }}
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {/* LEFT SIDEBAR */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ pointerEvents: 'auto', height: 'calc(100% - 100px)', zIndex: 10, marginLeft: 48, marginTop: 100 }}
            >
              <TiltCard className="sidebar-container" style={{ width: '380px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Tab bar */}
                <div style={{ display: 'flex', padding: '12px 16px 0 16px', gap: '4px', flexShrink: 0 }} role="tablist" aria-label="Sidebar section">
                  {SIDEBAR_TABS.map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = sidebarTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSidebarTab(tab.id)}
                        style={{
                          position: 'relative',
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '9px 0',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '10px 10px 0 0',
                          cursor: 'pointer',
                          color: isActive ? '#38bdf8' : 'var(--text-muted)',
                          background: 'transparent',
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="dashboard-sidebar-tab"
                            className="absolute inset-0 -z-10"
                            style={{ background: 'rgba(56, 189, 248, 0.12)', borderRadius: '10px 10px 0 0', borderBottom: '2px solid #38bdf8' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                          />
                        )}
                        <TabIcon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 20px 24px' }}>
                  <AnimatePresence mode="wait">
                    {sidebarTab === 'queue' && (
                      <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-strong)' }}>Priority Queue</h4>

                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                        >
                          {sortedHabs.map(hab => {
                            const isSelected = selectedHab === hab.habitation_id;
                            const bandColor = hab.red_zone_band === 'critical' ? '#ef4444' :
                                              hab.red_zone_band === 'high' ? '#f97316' :
                                              hab.red_zone_band === 'moderate' ? '#f59e0b' : '#10b981';
                            return (
                              <PriorityQueueCard
                                key={hab.habitation_id}
                                hab={hab}
                                isSelected={isSelected}
                                bandColor={bandColor}
                                unmet={currentPlan?.unmet_demand?.[hab.habitation_id]}
                                onSelect={() => setSelectedHab(hab.habitation_id)}
                              />
                            );
                          })}
                        </motion.div>

                        {healthStatus && healthStatus !== 'HEALTHY' && (
                          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-red-400)', fontSize: '13px', fontWeight: 600 }}>
                              <span style={{ animation: 'unmet-pulse 1.5s infinite' }}>⚠️</span> Plan At Risk
                            </div>
                            <Link to="/plan-health" style={{ color: 'var(--ink-red-400)', fontSize: '12px', textDecoration: 'underline' }}>View Details</Link>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {sidebarTab === 'more' && (
                      <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Legend />
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { to: '/plan-health', label: 'Plan Health' },
                            { to: '/what-if', label: 'What-If Analysis' },
                            { to: '/audit-log', label: 'System Audit Log' },
                          ].map(link => (
                            <Link
                              key={link.to}
                              to={link.to}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px',
                                border: '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              {link.label} <ArrowRight size={13} />
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER CONTENT */}
        <div style={{ flex: 1, position: 'relative', pointerEvents: 'none' }}>

          {/* KPI strip: a new mission-control summary that didn't exist
              before - population in scope, unmet demand, objective value -
              all derived from data already in state. Kept separate from
              SolverStatusBadge (top-right) rather than merged into it: that
              component self-positions with `position: absolute`, so nesting
              it inside a flex row would just break its layout rather than
              genuinely combine the two. */}
          <div
            className="solver-badge"
            style={{
              position: 'absolute', top: 100, left: 20, zIndex: 15, pointerEvents: 'auto',
              display: 'flex', alignItems: 'center',
              backgroundColor: 'var(--panel-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--panel-border)', borderRadius: '16px',
              boxShadow: '0 8px 32px var(--shadow-light)',
              padding: '10px 4px',
            }}
          >
            <KpiStat icon={Users} label="Population" value={totalPopulation} tint="#e2e8f0" />
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--panel-border)', margin: '0 2px' }} />
            <KpiStat icon={TrendingDown} label="Unmet demand" value={totalUnmet} tint={totalUnmet > 0 ? '#f87171' : '#34d399'} />
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--panel-border)', margin: '0 2px' }} />
            <KpiStat icon={Gauge} label="Objective" value={objectiveValue} decimalPlaces={1} tint="#38bdf8" />
          </div>

          <div className="solver-badge" style={{ position: 'absolute', top: 100, right: 16, pointerEvents: 'auto' }}>
            <SolverStatusBadge plan={currentPlan} />
          </div>

        </div>

        {/* RIGHT EXPLAINABILITY PANEL */}
        <AnimatePresence mode="wait">
          {selectedHab && (
            <motion.div
              key={selectedHab}
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ pointerEvents: 'auto', height: 'calc(100% - 100px)', marginTop: 100 }}
            >
              <TiltCard className="explainability-panel" style={{ width: '340px', height: '100%', overflow: 'hidden' }}>
                <ExplainabilityPanelContent
                  habitationId={selectedHab}
                  habitations={habitations}
                  sites={sites}
                  currentPlan={currentPlan}
                  routesData={routesData}
                  onClose={() => setSelectedHab(null)}
                />
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Dashboard;
