import React from 'react';
import { motion } from 'framer-motion';

const ApprovalModal = ({ pendingPlanData, onApprove, onReject }) => {
  return (
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
                  <h4 style={{ margin: 0, color: 'var(--ink-amber)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠</span> Proposed Plan Change
                  </h4>
                  <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: 'var(--ink-sky)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Source: DEMO EVENT SIMULATOR
                  </div>
                </div>
                
                {pendingPlanData.invalidation_reason && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: 'var(--ink-red-500)', fontWeight: 700, fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                {pendingPlanData.changes && pendingPlanData.changes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {Object.entries(
                      pendingPlanData.changes.reduce((acc, curr) => {
                        if (!acc[curr.habitation_id]) acc[curr.habitation_id] = { removed: [], added: [] };
                        if (curr.type === 'REMOVED') acc[curr.habitation_id].removed.push(curr);
                        if (curr.type === 'ADDED') acc[curr.habitation_id].added.push(curr);
                        return acc;
                      }, {})
                    ).map(([habId, data]) => {
                      const habName = pendingPlanData.pending_data?.habitations?.[habId]?.name || habId;
                      const removedStrs = data.removed.map(r => `${pendingPlanData.pending_data?.sites?.[r.site_id]?.name || r.site_id} via ${r.route_id}`);
                      const addedStrs = data.added.map(a => `${pendingPlanData.pending_data?.sites?.[a.site_id]?.name || a.site_id} via ${a.route_id}`);
                      
                      return (
                        <div key={habId} style={{ backgroundColor: 'var(--inner-bg)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px' }}>{habName}</div>
                          {removedStrs.length > 0 && (
                            <div style={{ color: 'var(--ink-red-500)', textDecoration: 'line-through', marginBottom: '2px' }}>
                              Previous: {removedStrs.join(', ')}
                            </div>
                          )}
                          {addedStrs.length > 0 && (
                            <div style={{ color: 'var(--ink-emerald-500)', fontWeight: 600 }}>
                              ➜ New: {addedStrs.join(', ')}
                            </div>
                          )}
                          {pendingPlanData.unmet_demand?.[habId] > 0 && (
                            <div style={{ color: 'var(--ink-amber)', fontWeight: 600, marginTop: '2px' }}>
                              ➜ New: UNASSIGNED ({pendingPlanData.unmet_demand[habId]} people unmet demand)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Objective impact: <br/>
                  <span style={{ textDecoration: 'line-through', color: 'var(--ink-red-500)' }}>{pendingPlanData.old_objective?.toFixed(1) || 'N/A'}</span> 
                  {' '} -{'>'} {' '}
                  <span style={{ color: 'var(--ink-emerald-500)', fontWeight: 'bold' }}>{pendingPlanData.new_objective?.toFixed(1) || 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    onClick={onApprove}
                    style={{ flex: 1, padding: '10px', backgroundColor: 'var(--solid-emerald)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Approve & Apply
                  </button>
                  <button 
                    onClick={onReject}
                    style={{ flex: 1, padding: '10px', backgroundColor: 'var(--inner-bg)', color: 'var(--text-strong)', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reject & Keep Current Plan
                  </button>
                </div>
              </motion.div>
  );
};
export default ApprovalModal;