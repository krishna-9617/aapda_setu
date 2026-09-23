import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const EventControls = ({ onPlanUpdate, sites = {}, habitations = {}, routesData = {} }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // States for manual selection
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [dropPercent, setDropPercent] = useState(0.5);

  const handleBaseline = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/plans/optimize`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server Error ${res.status}`);
      }
      onPlanUpdate();
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const handleRainfallEvent = async (intensity) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/events/rainfall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensity })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server Error ${res.status}`);
      }
      const data = await res.json();
      onPlanUpdate(data);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const handleBridgeCollapse = async () => {
    if (!selectedRouteId) {
      setErrorMsg("Please select a route first.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/field-reports/hazard-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_type: "bridge_collapse", target_id: selectedRouteId, reported_by: "Field Officer - Sector 1" })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server Error ${res.status}`);
      }
      const data = await res.json();
      console.log('Event Triggered, data:', data);
      onPlanUpdate(data);
    } catch (e) {
      console.error('Error triggering event:', e);
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const handleCapacityDrop = async () => {
    if (!selectedSiteId) {
      setErrorMsg("Please select a site first.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/field-reports/hazard-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_type: "capacity_drop", target_id: selectedSiteId, drop_percent: dropPercent, reported_by: "Field Officer - Sector 3" })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server Error ${res.status}`);
      }
      const data = await res.json();
      onPlanUpdate(data);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  const buttonBaseStyle = {
    display: 'block', width: '100%', padding: '12px', 
    cursor: loading ? 'not-allowed' : 'pointer', 
    border: 'none', borderRadius: '8px', 
    fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px',
    color: '#fff', outline: 'none'
  };

  const selectStyle = {
    width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', 
    backgroundColor: 'var(--panel-bg)', color: 'var(--text-strong)', 
    border: '1px solid var(--panel-border)', fontSize: '12px', outline: 'none'
  };

  return (
    <div style={{
      backgroundColor: 'var(--inner-bg)',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginTop: '20px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Field Incident Reporting</h4>
      
      {errorMsg && (
        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--ink-red-300)', borderRadius: '8px', fontSize: '12px' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <motion.button 
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.96 }}
        animate={loading ? { boxShadow: ['0 0 0px rgba(16, 185, 129, 0)', '0 0 15px rgba(16, 185, 129, 0.5)', '0 0 0px rgba(16, 185, 129, 0)'] } : {}}
        transition={{ repeat: loading ? Infinity : 0, duration: 1.5 }}
        disabled={loading}
        onClick={handleBaseline}
        style={{ ...buttonBaseStyle, marginBottom: '16px', backgroundColor: '#10b981', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}
      >
        {loading ? 'Optimizing...' : 'Reset to Fresh Baseline'}
      </motion.button>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-strong)', marginBottom: '8px', fontWeight: 600 }}>Simulate Rainfall Event:</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.05 }} whileTap={{ scale: loading ? 1 : 0.95 }}
            disabled={loading} onClick={() => handleRainfallEvent(0.3)}
            style={{ flex: 1, padding: '8px', backgroundColor: 'var(--btn-bg)', border: '1px solid #38bdf8', color: 'var(--ink-sky)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >Light (0.3)</motion.button>
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.05 }} whileTap={{ scale: loading ? 1 : 0.95 }}
            disabled={loading} onClick={() => handleRainfallEvent(0.6)}
            style={{ flex: 1, padding: '8px', backgroundColor: 'var(--btn-bg)', border: '1px solid #f59e0b', color: 'var(--ink-amber)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >Mod (0.6)</motion.button>
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.05 }} whileTap={{ scale: loading ? 1 : 0.95 }}
            disabled={loading} onClick={() => handleRainfallEvent(0.9)}
            style={{ flex: 1, padding: '8px', backgroundColor: 'var(--btn-bg)', border: '1px solid #ef4444', color: 'var(--ink-red-500)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >Severe (0.9)</motion.button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-strong)', marginBottom: '8px', fontWeight: 600 }}>Report Bridge Collapse:</div>
        <select 
          value={selectedRouteId} 
          onChange={(e) => setSelectedRouteId(e.target.value)}
          style={selectStyle}
        >
          <option value="" disabled>Select a route to collapse...</option>
          {Object.values(routesData).map(r => {
            const habName = habitations[r.from_habitation_id]?.name || r.from_habitation_id;
            const siteName = sites[r.to_site_id]?.name || r.to_site_id;
            return <option key={r.route_id} value={r.route_id}>{r.route_id} - {habName} -{'>'} {siteName}</option>
          })}
        </select>
        <motion.button 
          whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.96 }}
          disabled={loading} onClick={handleBridgeCollapse}
          style={{ ...buttonBaseStyle, backgroundColor: '#ef4444', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}
        >
          {loading ? 'Simulating...' : 'Report Bridge Collapse'}
        </motion.button>
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-strong)', marginBottom: '8px', fontWeight: 600 }}>Report Capacity Drop:</div>
        <select 
          value={selectedSiteId} 
          onChange={(e) => setSelectedSiteId(e.target.value)}
          style={selectStyle}
        >
          <option value="" disabled>Select a site...</option>
          {Object.values(sites).map(s => (
            <option key={s.site_id} value={s.site_id}>{s.site_id} - {s.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {[0.25, 0.5, 0.75, 0.9].map(p => (
            <button 
              key={p} 
              onClick={() => setDropPercent(p)}
              style={{
                flex: 1, padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer',
                backgroundColor: dropPercent === p ? '#f59e0b' : 'transparent',
                color: dropPercent === p ? '#fff' : '#f59e0b',
                border: '1px solid #f59e0b'
              }}
            >
              {p * 100}%
            </button>
          ))}
        </div>
        <motion.button 
          whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.96 }}
          disabled={loading} onClick={handleCapacityDrop}
          style={{ ...buttonBaseStyle, backgroundColor: '#f97316', boxShadow: '0 4px 14px 0 rgba(249, 115, 22, 0.39)' }}
        >
          {loading ? 'Simulating...' : 'Report Capacity Drop'}
        </motion.button>
      </div>
    </div>
  );
};

export default EventControls;
