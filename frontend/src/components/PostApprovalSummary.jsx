import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Post-approval summary: "Plan Applied", how many habitations were re-routed, the old -> new objective, and the
 * "SMS Alerts Dispatched" card (with its honesty disclosure about who really receives the messages).
 *
 * This markup was MOVED, unchanged, out of Dashboard.jsx when the Dashboard's Actions tab was removed - the
 * Dashboard was the only place that showed it. Only these things differ from the original: `eventSummary` is now
 * the `summary` prop; `position` is a prop (the Dashboard used 'absolute' inside its map column; Field Report
 * passes 'fixed' because the page itself scrolls); and `maxWidth` is an optional prop (the Dashboard's narrow map
 * column made the card wrap at ~460px, whereas on a wide page it would stretch to fit the longest SMS line).
 *
 * `summary` is the event API's response ({ changed_assignments, old_objective, new_objective, ... }) plus an
 * `alerts` array copied from GET /alerts/sent after the approval. Pass null to hide it.
 */
const PostApprovalSummary = ({ summary, onClose, position = 'absolute', maxWidth }) => (
  <AnimatePresence>
    {summary && (
      <motion.div
        initial={{ y: -50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, type: 'spring' }}
        style={{
          position,
          top: '100px',
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
          maxWidth,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: 'var(--ink-emerald-500)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>✓</span> Plan Applied
          </h4>
          <button onClick={() => onClose()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-strong)' }}>
          <strong>{summary.changed_assignments} habitations</strong> re-routed.
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Objective changed: <br/>
          <span style={{ textDecoration: 'line-through', color: 'var(--ink-red-500)' }}>{summary.old_objective?.toFixed(1) || 'N/A'}</span>
          {' '} -{'>'} {' '}
          <span style={{ color: 'var(--ink-emerald-500)', fontWeight: 'bold' }}>{summary.new_objective?.toFixed(1) || 'N/A'}</span>
        </div>

        {summary.alerts && summary.alerts.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--ink-sky)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>📱</span> SMS Alerts Dispatched
              <span style={{
                fontSize: '9px',
                backgroundColor: summary.alerts.some(a => a.delivery_mode === 'live') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                padding: '2px 6px', borderRadius: '4px',
                color: summary.alerts.some(a => a.delivery_mode === 'live') ? '#34d399' : '#38bdf8',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {summary.alerts.some(a => a.delivery_mode === 'live') ? 'Live via Twilio' : 'Simulated'}
              </span>
            </h4>
            {/* Honesty framing required regardless of mode: even a
                real Twilio send here goes to a verified team number
                substituted for the habitation, never to citizen data. */}
            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              {summary.alerts[0]?.disclosure || 'Demo SMS sent to verified team numbers only - production would integrate with district-authority-managed citizen contact lists.'}
            </p>
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {summary.alerts.slice(0, 3).map((alert, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--inner-bg)', padding: '8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>To: {alert.to}</span>
                    {alert.delivery_mode === 'live' ? (
                      <span style={{ color: alert.delivery_status === 'failed' ? '#f87171' : '#34d399', fontWeight: 700 }}>
                        {alert.delivery_status === 'failed' ? 'FAILED' : alert.delivery_status?.toUpperCase()}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>SIMULATED</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-light)', lineHeight: 1.4 }}>"{alert.message}"</div>
                  {alert.sid && (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '9.5px', marginTop: '4px' }}>Twilio SID: {alert.sid}</div>
                  )}
                  {alert.error && (
                    <div style={{ color: 'var(--ink-red-400)', fontSize: '9.5px', marginTop: '4px' }}>{alert.error}</div>
                  )}
                </div>
              ))}
              {summary.alerts.length > 3 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
                  + {summary.alerts.length - 3} more messages sent
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

export default PostApprovalSummary;
