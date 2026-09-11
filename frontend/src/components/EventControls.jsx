import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const EventControls = ({ onPlanUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleBridgeCollapse = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/events/bridge-collapse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_id: "R01" })
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

  const handleCapacityDrop = async (percent) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/events/capacity-drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: "SHL-005", drop_percent: percent })
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

  return (
    <div style={{
      backgroundColor: 'var(--inner-bg)',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginTop: '20px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Simulate Disruption</h4>
      
      {errorMsg && (
        <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '8px', fontSize: '12px' }}>
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

      <motion.button 
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.96 }}
        animate={loading ? { boxShadow: ['0 0 0px rgba(239, 68, 68, 0)', '0 0 15px rgba(239, 68, 68, 0.5)', '0 0 0px rgba(239, 68, 68, 0)'] } : {}}
        transition={{ repeat: loading ? Infinity : 0, duration: 1.5 }}
        disabled={loading}
        onClick={handleBridgeCollapse}
        style={{ ...buttonBaseStyle, marginBottom: '10px', backgroundColor: 'var(--btn-bg)', border: '1px solid var(--panel-border-light)', color: 'var(--text-strong)' }}
      >
        {loading ? 'Simulating...' : 'Simulate Bridge Collapse (R01)'}
      </motion.button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h5 style={{ margin: '4px 0 2px 0', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>Capacity Drop (SHL-005)</h5>
        <div style={{ display: 'flex', gap: '6px' }}>
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.96 }}
            disabled={loading}
            onClick={() => handleCapacityDrop(0.25)}
            style={{ ...buttonBaseStyle, padding: '8px', fontSize: '11px', backgroundColor: 'var(--btn-bg)', border: '1px solid var(--panel-border-light)', color: 'var(--text-strong)' }}
          >
            Minor<br/>(25%)
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.96 }}
            disabled={loading}
            onClick={() => handleCapacityDrop(0.50)}
            style={{ ...buttonBaseStyle, padding: '8px', fontSize: '11px', backgroundColor: 'var(--btn-bg)', border: '1px solid var(--panel-border-light)', color: 'var(--text-strong)' }}
          >
            Major<br/>(50%)
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.96 }}
            disabled={loading}
            onClick={() => handleCapacityDrop(0.75)}
            style={{ ...buttonBaseStyle, padding: '8px', fontSize: '11px', backgroundColor: 'var(--btn-bg)', border: '1px solid var(--panel-border-light)', color: 'var(--text-strong)' }}
          >
            Critical<br/>(75%)
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default EventControls;
