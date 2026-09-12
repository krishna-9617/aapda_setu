import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../components/MapView';
import SolverStatusBadge from '../components/SolverStatusBadge';
import EventControls from '../components/EventControls';
import PlanHealthPanel from '../components/PlanHealthPanel';
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
          <div style={{ marginTop: '8px', display: 'inline-block', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

        {hab.critical_care_population > 0 && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🏥</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#f87171', fontWeight: 600, letterSpacing: '0.5px' }}>Critical Care Population</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fca5a5' }}>{hab.critical_care_population} people (bedridden / oxygen / maternal)</span>
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
              <strong style={{ color: '#38bdf8', fontSize: '13px' }}>Immediate Relocation</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Site:</span>
              <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{sites[assignment.site_id]?.name || assignment.site_id}</strong>
            </div>
            {hab.critical_care_population > 0 && sites[assignment.site_id]?.has_healthcare && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '12px' }}>✅</span>
                <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 600 }}>Assigned to healthcare-capable shelter</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Route:</span>
              <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{assignment.route_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Assigned:</span>
              <strong style={{ color: '#10b981', fontSize: '13px' }}>{assignment.people_count} people</strong>
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
                <strong style={{ color: '#ef4444', fontSize: '13px' }}>{unmet} people</strong>
              </div>
            )}
            <p style={{ margin: '16px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5, fontStyle: 'italic' }}>
              Assigned by CP-SAT solver prioritizing shortest travel time while respecting exact space, food, and medical capacity limits.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#fca5a5', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              No viable route or capacity available. All <strong>{unmet}</strong> people are unassigned (Unmet Demand).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const WhatIfControls = ({ currentPlan }) => {
  const [multiplier, setMultiplier] = useState(1.0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ population_multiplier: multiplier })
      });
      const data = await res.json();
      setSimResult(data);
    } catch (e) {
      console.error(e);
    }
    setIsSimulating(false);
  };

  return (
    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🔮</span> What-If Analysis
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Explore population surge scenarios without affecting the live plan.</p>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Population Surge</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa' }}>+{((multiplier - 1) * 100).toFixed(0)}%</span>
        </div>
        <input 
          type="range" 
          min="1.0" max="2.0" step="0.1" 
          value={multiplier} 
          onChange={(e) => setMultiplier(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#a78bfa' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>Baseline (0%)</span>
          <span>+100%</span>
        </div>
      </div>

      <button 
        onClick={runSimulation}
        disabled={isSimulating}
        style={{ width: '100%', padding: '10px', backgroundColor: '#a78bfa', color: '#1e1b4b', border: 'none', borderRadius: '8px', cursor: isSimulating ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}
      >
        {isSimulating ? 'Simulating...' : 'Run Simulation'}
      </button>

      {simResult && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
          <div style={{ fontSize: '11px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 700 }}>Simulation Result</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: simResult.solver_status === 'OPTIMAL' ? '#10b981' : simResult.solver_status === 'INFEASIBLE' ? '#ef4444' : '#f59e0b' }}>
              {simResult.solver_status}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Unmet Demand:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>
              {simResult.current_total_unmet_demand}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Simulated Unmet Demand:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: simResult.total_unmet_demand > simResult.current_total_unmet_demand ? '#ef4444' : 'var(--text-light)' }}>
              {simResult.total_unmet_demand} 
              {simResult.total_unmet_demand > simResult.current_total_unmet_demand ? ` (+${simResult.total_unmet_demand - simResult.current_total_unmet_demand})` : ''}
            </span>
          </div>

          <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
            Simulation only - not applied to live plan
          </div>
        </div>
      )}
    </div>
  );
};


const Dashboard = () => {
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedHab, setSelectedHab] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [eventSummary, setEventSummary] = useState(null);
  const [pendingPlanData, setPendingPlanData] = useState(null);
  const [rejectToast, setRejectToast] = useState(false);
  const [planHistory, setPlanHistory] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

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

  const handlePlanUpdate = async (eventData = null) => {
    console.log("handlePlanUpdate called with eventData:", eventData);
    if (eventData && eventData.plan && eventData.plan.status === 'pending_approval') {
      setPendingPlanData(eventData);
    } else {
      setEventSummary(null);
      await fetchCurrentData();
    }
  };

  const handleApprove = async () => {
    if (!pendingPlanData) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingPlanData.plan.plan_id}/approve`, { method: 'POST' });
      const summaryData = { ...pendingPlanData };
      setPendingPlanData(null);
      
      // Fetch mock alerts
      try {
        const alertsRes = await fetch(`${API_BASE_URL}/alerts/sent`);
        const alertsData = await alertsRes.json();
        summaryData.alerts = alertsData.alerts;
      } catch (err) {
        console.error("Failed to fetch alerts", err);
      }
      
      // Update UI map
      await fetchCurrentData();
      
      // Show success toast
      setEventSummary(summaryData);
      setTimeout(() => setEventSummary(null), 12000);
    } catch (e) {
      console.error("Failed to approve plan", e);
    }
  };

  const handleReject = async () => {
    if (!pendingPlanData) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingPlanData.plan.plan_id}/reject`, { method: 'POST' });
      setPendingPlanData(null);
      
      // Show reject toast
      setRejectToast(true);
      setTimeout(() => setRejectToast(false), 3000);
    } catch (e) {
      console.error("Failed to reject plan", e);
    }
  };

  const displayHabs = pendingPlanData?.pending_data?.habitations || habitations;
  const sortedHabs = Object.values(displayHabs).sort((a, b) => b.priority_score - a.priority_score);

  const exportAuditLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "aapda_setu_audit_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)', backgroundImage: 'var(--bg-grad)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* DEMO MODE BANNER */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '24px', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: '#f59e0b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', backdropFilter: 'blur(4px)' }}>
        Demo mode: events and some data are simulated for illustration.
      </div>
      
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
            habitations={displayHabs} 
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
        
        {/* HAMBURGER BUTTON */}
        <button 
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'absolute',
            top: '32px',
            left: '32px',
            zIndex: 100,
            pointerEvents: 'auto',
            background: 'var(--panel-bg)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--panel-border)',
            borderRadius: '10px',
            boxShadow: '0 4px 12px var(--shadow-light)',
            width: '40px',
            height: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <motion.div animate={{ rotate: isSidebarOpen ? 45 : 0, y: isSidebarOpen ? 7 : 0 }} style={{ width: '20px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
          <motion.div animate={{ opacity: isSidebarOpen ? 0 : 1 }} style={{ width: '20px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
          <motion.div animate={{ rotate: isSidebarOpen ? -45 : 0, y: isSidebarOpen ? -7 : 0 }} style={{ width: '20px', height: '2px', backgroundColor: 'var(--text)', borderRadius: '2px' }} />
        </button>

        {/* LEFT SIDEBAR */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ pointerEvents: 'auto', height: '100%', zIndex: 10 }}
            >
              <TiltCard className="sidebar-container" style={{ width: '380px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', padding: '24px 24px 24px 72px', borderBottom: '1px solid var(--panel-border-light)', background: 'linear-gradient(to right, rgba(56, 189, 248, 0.1), transparent)' }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '-0.5px' }}>Aapda Setu</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Barpeta Dashboard</span>
                    <div 
                      title="Hazard layers, road network, and shelter data are cached locally - the decision engine doesn't require live internet to compute plans."
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px', cursor: 'help' }}
                    >
                      <span style={{ fontSize: '8px' }}>🟢</span>
                      <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Offline-ready</span>
                    </div>
                  </div>
                  
                  {/* THEME TOGGLE BUTTON */}
                  <button 
                    className="theme-toggle-btn"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '24px',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      pointerEvents: 'auto',
                      background: 'var(--inner-bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      fontSize: '16px'
                    }}
                  >
                    {theme === 'dark' ? '☀️' : '🌙'}
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-strong)' }}>Priority Queue</h4>
                  
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {sortedHabs.map(hab => {
                      const isSelected = selectedHab === hab.habitation_id;
                      const hasChanged = pendingPlanData && hab.red_zone_band !== habitations[hab.habitation_id]?.red_zone_band;
                      const bandColor = hab.red_zone_band === 'critical' ? '#ef4444' : 
                                        hab.red_zone_band === 'high' ? '#f97316' :
                                        hab.red_zone_band === 'moderate' ? '#f59e0b' : '#10b981';
                      return (
                        <motion.div 
                          key={hab.habitation_id}
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
                          onClick={() => setSelectedHab(hab.habitation_id)}
                          style={{
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
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Pop: <strong style={{color: 'var(--text-tertiary)'}}>{hab.population}</strong></div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{
                              backgroundColor: `rgba(${bandColor === '#ef4444' ? '239, 68, 68' : bandColor === '#f97316' ? '249, 115, 22' : bandColor === '#f59e0b' ? '245, 158, 11' : '16, 185, 129'}, 0.2)`,
                              color: bandColor,
                              border: `1px solid rgba(${bandColor === '#ef4444' ? '239, 68, 68' : bandColor === '#f97316' ? '249, 115, 22' : bandColor === '#f59e0b' ? '245, 158, 11' : '16, 185, 129'}, 0.3)`,
                              fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}>
                              {hab.red_zone_band}
                            </div>
                            
                            {currentPlan?.unmet_demand?.[hab.habitation_id] > 0 && (
                              <div style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'
                              }}>
                                Unmet: {currentPlan.unmet_demand[hab.habitation_id]}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  <PlanHealthPanel currentPlan={currentPlan} onPlanUpdate={handlePlanUpdate} />
                  <EventControls 
                    onPlanUpdate={handlePlanUpdate} 
                    sites={sites} 
                    habitations={habitations} 
                    routesData={routesData} 
                  />
                  <WhatIfControls currentPlan={currentPlan} />
                  <Legend />

                  {/* PLAN HISTORY */}
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-strong)' }}>Plan History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {planHistory.map((plan, idx) => {
                        const isCurrent = currentPlan && plan.plan_id === currentPlan.plan_id;
                        return (
                          <div key={plan.plan_id} style={{
                            padding: '12px',
                            backgroundColor: 'var(--inner-bg)',
                            border: `1px solid ${isCurrent ? '#10b981' : 'var(--panel-border-light)'}`,
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>
                                {plan.trigger_event || 'Initial Baseline'}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>{new Date(plan.timestamp).toLocaleTimeString()}</span>
                              <span>Obj: {plan.objective?.toFixed(1)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => setShowAuditLog(true)}
                      style={{ marginTop: '12px', width: '100%', padding: '10px', backgroundColor: 'transparent', color: 'var(--text-strong)', border: '1px solid var(--panel-border-light)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>📋</span> View Audit Log
                    </button>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER CONTENT */}
        <div style={{ flex: 1, position: 'relative', pointerEvents: 'none' }}>
          <div className="solver-badge" style={{ pointerEvents: 'auto' }}>
            <SolverStatusBadge plan={currentPlan} />
          </div>

          <AnimatePresence>
            {pendingPlanData && (
              <motion.div
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="approval-modal"
                style={{
                  position: 'absolute',
                  top: '80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--panel-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--panel-border)',
                  boxShadow: '0 12px 40px var(--shadow)',
                  borderRadius: '16px',
                  padding: '24px',
                  zIndex: 2000,
                  pointerEvents: 'auto',
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text-light)',
                  width: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠</span> Proposed Plan Change
                  </h4>
                  <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Source: DEMO EVENT SIMULATOR
                  </div>
                </div>
                
                {pendingPlanData.invalidation_reason && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠️</span> Plan Invalidated
                    </div>
                    <div style={{ color: 'var(--text-strong)', fontSize: '13px', lineHeight: '1.4' }}>
                      {pendingPlanData.invalidation_reason}
                    </div>
                  </div>
                )}
                
                <div style={{ fontSize: '14px', color: 'var(--text-strong)' }}>
                  This event triggers a re-optimization affecting <strong>{pendingPlanData.changed_assignments} habitations</strong>.
                </div>
                
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Objective impact: <br/>
                  <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{pendingPlanData.old_objective?.toFixed(1) || 'N/A'}</span> 
                  {' '} -{'>'} {' '}
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{pendingPlanData.new_objective?.toFixed(1) || 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    onClick={handleApprove}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Approve & Apply
                  </button>
                  <button 
                    onClick={handleReject}
                    style={{ flex: 1, padding: '10px', backgroundColor: 'var(--inner-bg)', color: 'var(--text-strong)', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reject & Keep Current Plan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {rejectToast && (
              <motion.div
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--panel-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--panel-border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  zIndex: 2000,
                  pointerEvents: 'none',
                  color: 'var(--text-light)',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Plan rejected - keeping current assignments
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {eventSummary && (
              <motion.div
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: 'spring' }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--panel-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--panel-border)',
                  boxShadow: '0 12px 40px var(--shadow)',
                  borderRadius: '16px',
                  padding: '16px 24px',
                  zIndex: 2000,
                  pointerEvents: 'auto',
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text-light)',
                  minWidth: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: '#10b981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>✓</span> Plan Applied
                  </h4>
                  <button onClick={() => setEventSummary(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--text-strong)' }}>
                  <strong>{eventSummary.changed_assignments} habitations</strong> re-routed.
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Objective changed: <br/>
                  <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{eventSummary.old_objective?.toFixed(1) || 'N/A'}</span> 
                  {' '} -{'>'} {' '}
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{eventSummary.new_objective?.toFixed(1) || 'N/A'}</span>
                </div>

                {eventSummary.alerts && eventSummary.alerts.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px' }}>📱</span> SMS Alerts Dispatched
                      <span style={{ fontSize: '9px', backgroundColor: 'rgba(56, 189, 248, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Simulated</span>
                    </h4>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                      {eventSummary.alerts.slice(0, 3).map((alert, idx) => (
                        <div key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>To: {alert.to}</div>
                          <div style={{ color: 'var(--text-light)', lineHeight: 1.4 }}>"{alert.message}"</div>
                        </div>
                      ))}
                      {eventSummary.alerts.length > 3 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
                          + {eventSummary.alerts.length - 3} more messages sent
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AUDIT LOG MODAL */}
          <AnimatePresence>
            {showAuditLog && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  right: '10%',
                  bottom: '10%',
                  backgroundColor: 'var(--panel-bg)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--panel-border)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  zIndex: 3000,
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-light)' }}>System Audit Log</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={exportAuditLog}
                      style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      Export JSON
                    </button>
                    <button 
                      onClick={() => setShowAuditLog(false)}
                      style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-light)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: 'var(--text-strong)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Timestamp</th>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Action Type</th>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Description</th>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Objective</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                              backgroundColor: log.action_type === 'plan_approved' ? 'rgba(16,185,129,0.15)' :
                                               log.action_type === 'plan_rejected' ? 'rgba(239,68,68,0.15)' :
                                               log.action_type === 'event_triggered' ? 'rgba(245,158,11,0.15)' :
                                               'rgba(56,189,248,0.15)',
                              color: log.action_type === 'plan_approved' ? '#10b981' :
                                     log.action_type === 'plan_rejected' ? '#ef4444' :
                                     log.action_type === 'event_triggered' ? '#f59e0b' :
                                     '#38bdf8'
                            }}>
                              {log.action_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{log.description}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{log.objective ? log.objective.toFixed(1) : '-'}</td>
                        </tr>
                      ))}
                      {auditLog.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT EXPLAINABILITY PANEL */}
        <AnimatePresence>
          {selectedHab && (
            <motion.div
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ pointerEvents: 'auto', height: '100%' }}
            >
              <TiltCard className="explainability-panel" style={{ width: '340px', height: '100%', overflow: 'hidden' }}>
                <ExplainabilityPanelContent 
                  habitationId={selectedHab} 
                  habitations={displayHabs} 
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
