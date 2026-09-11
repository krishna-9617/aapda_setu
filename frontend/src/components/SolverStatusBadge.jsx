import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

function AnimatedValue({ value, decimals = 0, prefix = "", suffix = "" }) {
  const spring = useSpring(value || 0, { mass: 0.8, stiffness: 75, damping: 15 });
  const [displayValue, setDisplayValue] = useState(value || 0);

  useEffect(() => {
    spring.set(value || 0);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}

const SolverStatusBadge = ({ plan }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!plan) return null;

  const isOptimal = plan.solver_status === 'OPTIMAL';
  const statusColor = isOptimal ? '#10b981' : '#f59e0b';
  const statusBg = isOptimal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const statusBorder = isOptimal ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'var(--panel-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 8px 32px var(--shadow-light), inset 0 1px 0 var(--panel-border-light)',
        zIndex: 1000,
        fontFamily: 'Inter, sans-serif',
        color: 'var(--text-light)',
        minWidth: '220px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Solver Status
          <div style={{ position: 'relative' }} 
               onMouseEnter={() => setShowTooltip(true)} 
               onMouseLeave={() => setShowTooltip(false)}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%', border: '1px solid var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', cursor: 'help'
            }}>i</div>
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: '-4px', width: '280px',
                    backgroundColor: 'var(--bg)', backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 3000,
                    color: 'var(--text-strong)', fontSize: '12px', lineHeight: 1.5, textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  {/* Arrow pointer */}
                  <div style={{
                    position: 'absolute', top: '-5px', right: '8px', width: '10px', height: '10px',
                    backgroundColor: 'var(--bg)', borderTop: '1px solid var(--panel-border)', borderLeft: '1px solid var(--panel-border)',
                    transform: 'rotate(45deg)'
                  }}></div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    This uses Google OR-Tools CP-SAT, a constraint optimization solver. It finds the assignment of habitations to shelters that minimizes total travel time, risk, and unmet demand — while respecting hard capacity constraints. If no optimal solution exists, it falls back to a greedy heuristic algorithm.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </span>
        
        {/* Glowing Live Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
            <span
              style={{
                position: 'absolute',
                display: 'inline-flex',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: statusColor,
                opacity: 0.75,
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                boxShadow: `0 0 10px ${statusColor}`
              }}
            />
          </span>
        </div>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        backgroundColor: statusBg,
        color: statusColor,
        border: `1px solid ${statusBorder}`,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        marginBottom: '14px'
      }}>
        {plan.solver_status}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
            Solve Time
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-strong)', marginTop: '2px' }}>
            <AnimatedValue value={plan.solver_time_sec || 0} decimals={3} suffix="s" />
          </div>
        </div>

        {plan.objective !== undefined && plan.objective !== null && (
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
              Objective
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              <AnimatedValue value={plan.objective} decimals={1} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default SolverStatusBadge;
