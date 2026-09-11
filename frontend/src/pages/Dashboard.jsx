import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../components/MapView';
import SolverStatusBadge from '../components/SolverStatusBadge';
import EventControls from '../components/EventControls';

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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Route:</span>
              <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{assignment.route_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Assigned:</span>
              <strong style={{ color: '#10b981', fontSize: '13px' }}>{assignment.people_count} people</strong>
            </div>
            {routesData && routesData[assignment.route_id] && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: unmet > 0 ? '12px' : '0', borderBottom: unmet > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: unmet > 0 ? '12px' : '0' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Travel Time:</span>
                <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>{routesData[assignment.route_id].travel_time_min} mins</strong>
              </div>
            )}
            {unmet > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unmet Demand:</span>
                <strong style={{ color: '#ef4444', fontSize: '13px' }}>{unmet} people</strong>
              </div>
            )}
            <p style={{ margin: '16px 0 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5, fontStyle: 'italic' }}>
              Assigned by CP-SAT solver prioritizing shortest travel time while respecting exact shelter capacity limits.
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

const Dashboard = () => {
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedHab, setSelectedHab] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [eventSummary, setEventSummary] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.leaflet-marker-icon')) return;
      if (e.target.closest('.sidebar-container')) return;
      if (e.target.closest('.explainability-panel')) return;
      if (e.target.closest('.solver-badge')) return;
      if (e.target.closest('.hamburger-btn')) return;
      if (e.target.closest('.theme-toggle-btn')) return;
      
      setSelectedHab(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let planRes = await fetch('http://127.0.0.1:8000/plans/current');
        if (!planRes.ok) {
          planRes = await fetch('http://127.0.0.1:8000/plans/optimize', { method: 'POST' });
        }
        
        const [habsRes, sitesRes, routesRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/habitations'),
          fetch('http://127.0.0.1:8000/sites'),
          fetch('http://127.0.0.1:8000/routes')
        ]);
        
        setCurrentPlan(await planRes.json());
        setHabitations(await habsRes.json());
        setSites(await sitesRes.json());
        setRoutesData(await routesRes.json());
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handlePlanUpdate = async (eventData = null) => {
    console.log("handlePlanUpdate called with eventData:", eventData);
    if (eventData && eventData.changed_assignments !== undefined) {
      console.log("Setting event summary:", eventData);
      setEventSummary(eventData);
      setTimeout(() => setEventSummary(null), 8000); // 8 seconds
    } else {
      console.log("Clearing event summary");
      setEventSummary(null);
    }

    try {
      const [planRes, sitesRes, routesRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/plans/current'),
        fetch('http://127.0.0.1:8000/sites'),
        fetch('http://127.0.0.1:8000/routes')
      ]);
      setCurrentPlan(await planRes.json());
      setSites(await sitesRes.json());
      setRoutesData(await routesRes.json());
    } catch (e) {
      console.error("Failed to fetch updated plan", e);
    }
  };

  const sortedHabs = Object.values(habitations).sort((a, b) => b.priority_score - a.priority_score);

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
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Barpeta Dashboard</span>
                  
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
                            <div style={{ fontWeight: 600, fontSize: '14px', color: isSelected ? '#38bdf8' : 'var(--text-strong)' }}>{hab.name}</div>
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

                  <EventControls onPlanUpdate={handlePlanUpdate} />
                  <Legend />
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
                  <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>⚠</span> Event Triggered
                  </h4>
                  <button onClick={() => setEventSummary(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--text-strong)' }}>
                  <strong>{eventSummary.changed_assignments} habitations</strong> re-routed.
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Objective changed: <br/>
                  <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{eventSummary.old_objective?.toFixed(1) || 'N/A'}</span> 
                  {' '}→{' '}
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{eventSummary.new_objective?.toFixed(1) || 'N/A'}</span>
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
