import MeshBackground from '../components/MeshBackground';
import Tilt3D from "../components/Tilt3D";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Beaker, Play, CheckCircle2, GripVertical, MapPin, TrendingUp,
  Waves, ArrowRight, AlertTriangle, ShieldCheck, XCircle, Activity,
  ChevronRight, Clock, Zap, BarChart3, RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";
import { MagicCard } from "../components/ui/magic-card";
import { ShimmerButton } from "../components/ui/shimmer-button";
import { NumberTicker } from "../components/ui/number-ticker";

/* ─────────────────────────────────────────────────────────────────
   Inline Approval Panel
   Shown after "Promote to Live Plan" is clicked. Stays on this page.
   Approve → calls /plans/{id}/approve, then fetches fresh plan health.
   Reject  → calls /plans/{id}/reject, clears pending state.
   ───────────────────────────────────────────────────────────────── */
function WhatIfApprovalPanel({ pendingPlan, pendingData, onApproved, onRejected, theme }) {
  const [busy, setBusy] = useState(null); // 'approving' | 'rejecting' | null
  const [error, setError] = useState(null);

  const isDark = theme !== 'light';

  const changes = pendingPlan?.changes ?? [];
  const groupedChanges = changes.reduce((acc, c) => {
    if (!acc[c.habitation_id]) acc[c.habitation_id] = { removed: [], added: [] };
    if (c.type === 'REMOVED') acc[c.habitation_id].removed.push(c);
    if (c.type === 'ADDED')   acc[c.habitation_id].added.push(c);
    return acc;
  }, {});

  const handleApprove = async () => {
    setBusy('approving');
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/${pendingPlan.plan_id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Approve failed');
      const approved = await res.json();
      onApproved(approved);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy('rejecting');
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/${pendingPlan.plan_id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Reject failed');
      onRejected();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const solverTint = pendingPlan?.solver_status === 'OPTIMAL' ? '#34d399'
    : pendingPlan?.solver_status === 'INFEASIBLE' ? '#f87171' : '#fbbf24';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="as-glass rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(99,102,241,0.35)' }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(167,139,250,0.12) 100%)',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--as-hairline)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} style={{ color: '#818cf8' }} />
          <span className="as-heading" style={{ fontSize: '0.9375rem', margin: 0 }}>
            Officer Approval Required
          </span>
        </div>
        <span className="as-chip as-chip-tint" style={{ '--as-chip-tint': '#fbbf24' }}>
          Pending
        </span>
      </div>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Solver metrics */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: 90, background: 'var(--as-surface-0)', borderRadius: 10,
            padding: '0.625rem 0.875rem', border: '1px solid var(--as-hairline)', textAlign: 'center',
          }}>
            <div className="as-numeric" style={{ fontSize: '1.1rem', fontWeight: 700, color: solverTint }}>
              {pendingPlan?.solver_status || '—'}
            </div>
            <div className="as-small" style={{ marginTop: 2 }}>Solver</div>
          </div>
          <div style={{
            flex: 1, minWidth: 90, background: 'var(--as-surface-0)', borderRadius: 10,
            padding: '0.625rem 0.875rem', border: '1px solid var(--as-hairline)', textAlign: 'center',
          }}>
            <div className="as-numeric" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-light)' }}>
              {pendingPlan?.solver_time_sec != null ? `${(pendingPlan.solver_time_sec * 1000).toFixed(0)} ms` : '—'}
            </div>
            <div className="as-small" style={{ marginTop: 2 }}>Solve time</div>
          </div>
          <div style={{
            flex: 1, minWidth: 90, background: 'var(--as-surface-0)', borderRadius: 10,
            padding: '0.625rem 0.875rem', border: '1px solid var(--as-hairline)', textAlign: 'center',
          }}>
            <div className="as-numeric" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-light)' }}>
              {sum(pendingPlan?.unmet_demand ?? {})}
            </div>
            <div className="as-small" style={{ marginTop: 2 }}>Unmet</div>
          </div>
        </div>

        {/* Assignment changes */}
        {Object.keys(groupedChanges).length > 0 && (
          <div>
            <div className="as-small" style={{ fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>
              Assignment changes ({changes.length / 2 | 0} habitation{(changes.length / 2 | 0) !== 1 ? 's' : ''})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
              {Object.entries(groupedChanges).map(([habId, data]) => {
                const habName = pendingData?.habitations?.[habId]?.name || habId;
                const removed = data.removed.map(r => pendingData?.sites?.[r.site_id]?.name || r.site_id);
                const added   = data.added.map(a => pendingData?.sites?.[a.site_id]?.name || a.site_id);
                return (
                  <div key={habId} style={{
                    background: 'var(--as-surface-0)', borderRadius: 8, padding: '0.5rem 0.75rem',
                    border: '1px solid var(--as-hairline)', fontSize: '0.75rem',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{habName}</span>
                    {removed.length > 0 && (
                      <span style={{ color: '#f87171', textDecoration: 'line-through', marginLeft: 6 }}>
                        {removed.join(', ')}
                      </span>
                    )}
                    {added.length > 0 && (
                      <span style={{ color: '#34d399', marginLeft: 6 }}>
                        → {added.join(', ')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8, padding: '0.5rem 0.75rem',
          }}>
            <p className="as-small" style={{ color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            onClick={handleApprove}
            disabled={!!busy}
            style={{
              flex: 1, padding: '0.7rem 1rem', borderRadius: 10,
              background: busy === 'approving' ? 'rgba(52,211,153,0.2)' : 'rgba(16,185,129,0.85)',
              color: 'white', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, opacity: busy && busy !== 'approving' ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {busy === 'approving' ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Approving…</>
            ) : (
              <><CheckCircle2 size={14} /> Approve &amp; Go Live</>
            )}
          </button>
          <button
            onClick={handleReject}
            disabled={!!busy}
            style={{
              flex: 1, padding: '0.7rem 1rem', borderRadius: 10,
              background: 'var(--as-surface-0)', color: 'var(--text-strong)',
              border: '1px solid var(--as-hairline)', cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, opacity: busy && busy !== 'rejecting' ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {busy === 'rejecting' ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Rejecting…</>
            ) : (
              <><XCircle size={14} /> Reject</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* helper */
function sum(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + b, 0);
}

/* ─────────────────────────────────────────────────────────────────
   Inline Plan Health Panel (shown after approval)
   ───────────────────────────────────────────────────────────────── */
function InlinePlanHealth({ health }) {
  if (!health) return null;
  const isHealthy = health.status === 'HEALTHY';
  const tint = isHealthy ? '#34d399' : '#fbbf24';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="as-glass rounded-2xl"
      style={{ border: `1px solid ${isHealthy ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}
    >
      <div style={{
        padding: '0.875rem 1.25rem',
        background: isHealthy ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
        borderBottom: '1px solid var(--as-hairline)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Activity size={16} style={{ color: tint }} />
        <span className="as-heading" style={{ fontSize: '0.9rem', margin: 0 }}>
          New Plan Health
        </span>
        <span className="as-chip as-chip-tint" style={{ '--as-chip-tint': tint, marginLeft: 'auto' }}>
          {health.status}
        </span>
      </div>
      <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="as-small">Unmet demand</span>
          <span className="as-numeric as-small" style={{ fontWeight: 700, color: tint }}>
            {health.unmet_demand_total.toLocaleString()} people
          </span>
        </div>
        {health.coverage != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="as-small">Intervention coverage</span>
            <span className="as-numeric as-small" style={{ fontWeight: 700, color: 'var(--text-light)' }}>
              {Math.round(health.coverage * 100)}%
            </span>
          </div>
        )}
        {health.interventions?.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div className="as-small" style={{ fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>
              Recommended interventions ({health.interventions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {health.interventions.map((iv, i) => (
                <div key={iv.id || i} style={{
                  background: 'var(--as-surface-0)', borderRadius: 8, padding: '0.5rem 0.75rem',
                  border: '1px solid var(--as-hairline)', fontSize: '0.75rem',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-light)', marginBottom: 2 }}>{iv.title}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{iv.impact}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main WhatIfPage
   ───────────────────────────────────────────────────────────────── */
const WhatIfPage = ({ theme }) => {
  const [multiplier, setMultiplier]   = useState(1.0);
  const [hazardScore, setHazardScore] = useState(0.5);
  const [selectedHabId, setSelectedHabId] = useState("GLOBAL");

  const [habitations, setHabitations] = useState({});
  const [sites, setSites]             = useState({});
  const [routesData, setRoutesData]   = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult]     = useState(null);

  // Inline approval state
  const [pendingPlanState, setPendingPlanState] = useState(null);  // { plan, data }
  const [isPromoting, setIsPromoting]           = useState(false);
  const [approvedPlan, setApprovedPlan]         = useState(null);
  const [postApprovalHealth, setPostApprovalHealth] = useState(null);
  const [outcomeMsg, setOutcomeMsg]             = useState(null); // 'approved' | 'rejected'

  // Resizable panel
  const [leftPct, setLeftPct] = useState(44);
  const containerRef  = useRef(null);
  const leftPanelRef  = useRef(null);
  const isDragging    = useRef(false);
  const liveLeftPct   = useRef(44);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  // ── drag-to-resize ──────────────────────────────────────────────
  const startDrag = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setLeftPct(liveLeftPct.current);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current || !leftPanelRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(20, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100));
    liveLeftPct.current = pct;
    leftPanelRef.current.style.width = pct + '%';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);

  // ── initial data fetch ──────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [habsRes, sitesRes, routesRes, planRes] = await Promise.all([
          fetch(`${API_BASE_URL}/habitations`),
          fetch(`${API_BASE_URL}/sites`),
          fetch(`${API_BASE_URL}/routes`),
          fetch(`${API_BASE_URL}/plans/current`)
        ]);
        setHabitations(await habsRes.json());
        setSites(await sitesRes.json());
        setRoutesData(await routesRes.json());
        setCurrentPlan(await planRes.json());
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  // ── simulate ────────────────────────────────────────────────────
  const runSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);
    setPendingPlanState(null);
    setApprovedPlan(null);
    setPostApprovalHealth(null);
    setOutcomeMsg(null);
    try {
      const payload = { population_multiplier: multiplier };
      if (selectedHabId !== "GLOBAL") {
        payload.target_habitation_id = selectedHabId;
        payload.hazard_score = hazardScore;
      }
      const res = await fetch(`${API_BASE_URL}/plans/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSimResult(data);
    } catch (e) { console.error(e); }
    setIsSimulating(false);
  };

  // ── promote to pending (implement-what-if) ───────────────────────
  const promoteScenario = async () => {
    if (!simResult?.simulated_pending_plan) return;
    setIsPromoting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/implement-what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulated_pending_plan: simResult.simulated_pending_plan,
          simulated_data: simResult.simulated_data,
        })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setPendingPlanState({
          plan: data.pending_plan,
          data: simResult.simulated_data,
        });
      }
    } catch (e) { console.error(e); }
    setIsPromoting(false);
  };

  // ── after approve: fetch fresh plan + health ─────────────────────
  const handleApproved = async (approved) => {
    setApprovedPlan(approved);
    setPendingPlanState(null);
    setOutcomeMsg('approved');
    // Refresh live plan and plan health
    try {
      const [planRes, healthRes] = await Promise.all([
        fetch(`${API_BASE_URL}/plans/current`),
        fetch(`${API_BASE_URL}/plans/health`),
      ]);
      const livePlan = await planRes.json();
      const health   = await healthRes.json();
      setCurrentPlan(livePlan);
      setPostApprovalHealth(health);
    } catch (e) { console.error(e); }
  };

  const handleRejected = () => {
    setPendingPlanState(null);
    setOutcomeMsg('rejected');
  };

  // ── derived ──────────────────────────────────────────────────────
  const mapHabitations = simResult?.simulated_data?.habitations || habitations;
  const mapPlan        = approvedPlan || simResult?.simulated_pending_plan || currentPlan;
  const surgePercent   = Math.round((multiplier - 1) * 100);

  const baselineUnmet  = simResult?.current_total_unmet_demand ?? 0;
  const simulatedUnmet = simResult?.total_unmet_demand ?? 0;
  const delta          = simulatedUnmet - baselineUnmet;
  const isWorse        = delta > 0;
  const statusTint     = simResult?.solver_status === 'OPTIMAL' ? '#34d399'
    : simResult?.solver_status === 'INFEASIBLE' ? '#f87171' : '#fbbf24';

  // ── controls panel ───────────────────────────────────────────────
  const controlsContent = (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="relative z-10 space-y-4">
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[150px] pointer-events-none -z-10" />

      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ '--as-icon-tint': '#a78bfa' }}>
          <Beaker size={20} />
        </div>
        <h1 className="as-title mb-2">What-If Analysis</h1>
        <p className="as-body" style={{ color: 'var(--text-muted)' }}>
          Model hazard spikes and population surges in a sandbox, then promote and approve — all without leaving this page.
        </p>
      </motion.div>

      {/* Scenario Parameters */}
      <motion.div variants={staggerItem} className="rounded-2xl overflow-hidden">
        <MagicCard gradientColor="rgba(167,139,250,0.12)" className="border-white/10 bg-white/[0.02]">
          <div className="relative z-10 p-5 space-y-4">
            <h3 className="as-small" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)' }}>
              Scenario Parameters
            </h3>

            {/* Target Area */}
            <div className="space-y-2">
              <label className="as-small" style={{ fontWeight: 600, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} style={{ color: '#a78bfa' }} /> Target Area
              </label>
              <select
                value={selectedHabId}
                onChange={e => setSelectedHabId(e.target.value)}
                className="w-full p-2.5 rounded-lg text-sm outline-none transition-colors light-select"
                style={{
                  background: 'var(--as-surface-0)',
                  border: '1px solid var(--as-hairline)',
                  color: 'var(--text-light)',
                  borderRadius: 8,
                }}
              >
                <option value="GLOBAL">Global Scenario (All Habitations)</option>
                {Object.values(habitations).map(hab => (
                  <option key={hab.habitation_id} value={hab.habitation_id}>
                    {hab.name} ({hab.habitation_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Population Surge Slider */}
            <div className="space-y-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="as-small" style={{ fontWeight: 600, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} style={{ color: '#a78bfa' }} /> Population Surge
                </label>
                <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.875rem' }}>+{surgePercent}%</span>
              </div>
              <input
                type="range" min={1.0} max={2.0} step={0.1}
                value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            {/* Hazard Score (conditional) */}
            <AnimatePresence>
              {selectedHabId !== "GLOBAL" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="as-small" style={{ fontWeight: 600, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Waves size={13} style={{ color: '#a78bfa' }} /> Target Hazard Score
                    </label>
                    <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.875rem' }}>{hazardScore.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={0.1} max={1.0} step={0.05}
                    value={hazardScore} onChange={e => setHazardScore(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Run button */}
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                background: isSimulating ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.85)',
                color: 'white', border: 'none', cursor: isSimulating ? 'not-allowed' : 'pointer',
                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {isSimulating
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Simulating…</>
                : <><Play size={14} /> Run Simulation</>
              }
            </button>
          </div>
        </MagicCard>
      </motion.div>

      {/* Results area */}
      <AnimatePresence mode="wait">
        {!simResult ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              borderRadius: 16, border: '1px dashed var(--as-hairline)',
              padding: '3rem 1.5rem', textAlign: 'center', background: 'var(--as-surface-0)',
            }}
          >
            <Beaker size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p className="as-body" style={{ color: 'var(--text-muted)' }}>Run a simulation to see impact.</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Before / After compare */}
            <Tilt3D strength={4} className="rounded-2xl overflow-hidden">
              <div className="as-glass rounded-2xl p-5">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  {/* Baseline */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h4 className="as-small" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Baseline
                    </h4>
                    <div className="as-numeric" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-light)' }}>
                      <NumberTicker key={`base-${baselineUnmet}`} value={baselineUnmet} />
                    </div>
                    <p className="as-small" style={{ color: 'var(--text-muted)', marginTop: 4 }}>Unmet Demand</p>
                  </div>

                  {/* Delta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <ArrowRight size={20} style={{ color: isWorse ? '#f87171' : '#34d399', opacity: delta !== 0 ? 1 : 0.3 }} />
                    <span className="as-numeric" style={{ fontSize: '0.75rem', fontWeight: 700, color: isWorse ? '#f87171' : '#34d399' }}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </span>
                  </div>

                  {/* Simulated */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <h4 className="as-small" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Simulated
                    </h4>
                    <div className="as-numeric" style={{ fontSize: '2rem', fontWeight: 700, color: statusTint }}>
                      <NumberTicker key={`sim-${simulatedUnmet}`} value={simulatedUnmet} />
                    </div>
                    <p className="as-small" style={{ marginTop: 4, fontWeight: 600, color: statusTint }}>
                      {simResult.solver_status}
                    </p>
                  </div>
                </div>

                {/* Solver stats row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--as-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="as-small">{simResult.solver_time_sec != null ? `${(simResult.solver_time_sec * 1000).toFixed(0)} ms` : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="as-small">Gap: {simResult.solver_gap_percent?.toFixed(2) ?? '0.00'}%</span>
                  </div>
                  {simResult.target_habitation_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} style={{ color: '#a78bfa' }} />
                      <span className="as-small" style={{ color: '#a78bfa' }}>{simResult.target_habitation_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </Tilt3D>

            {/* Health warnings */}
            {simResult.health?.interventions?.length > 0 && (
              <div style={{
                padding: '0.625rem 1rem', borderRadius: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span className="as-small" style={{ color: '#f59e0b' }}>
                  <strong>{simResult.health.interventions.length}</strong> intervention{simResult.health.interventions.length !== 1 ? 's' : ''} recommended for this scenario.
                </span>
              </div>
            )}

            {/* Outcome banner */}
            <AnimatePresence>
              {outcomeMsg === 'approved' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)',
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                  <div>
                    <div className="as-small" style={{ fontWeight: 700, color: '#34d399' }}>Scenario approved &amp; live</div>
                    <div className="as-small" style={{ color: 'var(--text-muted)' }}>The live plan has been updated. Plan health is shown below.</div>
                  </div>
                </motion.div>
              )}
              {outcomeMsg === 'rejected' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                  }}
                >
                  <XCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                  <div>
                    <div className="as-small" style={{ fontWeight: 700, color: '#f87171' }}>Scenario rejected</div>
                    <div className="as-small" style={{ color: 'var(--text-muted)' }}>Current live plan unchanged. Run another simulation anytime.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Approval panel (shown after "Promote") */}
            <AnimatePresence>
              {pendingPlanState && (
                <WhatIfApprovalPanel
                  pendingPlan={pendingPlanState.plan}
                  pendingData={pendingPlanState.data}
                  onApproved={handleApproved}
                  onRejected={handleRejected}
                  theme={theme}
                />
              )}
            </AnimatePresence>

            {/* Post-approval plan health */}
            <AnimatePresence>
              {postApprovalHealth && outcomeMsg === 'approved' && (
                <InlinePlanHealth health={postApprovalHealth} />
              )}
            </AnimatePresence>

            {/* Promote button — hidden once in pending or already decided */}
            {!pendingPlanState && !outcomeMsg && (
              <ShimmerButton
                onClick={promoteScenario}
                disabled={isPromoting}
                background="rgba(99,102,241,0.15)"
                shimmerColor="rgba(255,255,255,0.5)"
                className="w-full"
              >
                <span style={{ color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isPromoting
                    ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Promoting…</>
                    : <><ChevronRight size={14} /> Promote to Live Plan</>
                  }
                </span>
              </ShimmerButton>
            )}

            {/* "Run new simulation" after outcome */}
            {outcomeMsg && (
              <button
                onClick={() => { setSimResult(null); setOutcomeMsg(null); setPostApprovalHealth(null); setApprovedPlan(null); }}
                style={{
                  width: '100%', padding: '0.65rem', borderRadius: 10,
                  background: 'var(--as-surface-0)', border: '1px solid var(--as-hairline)',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <BarChart3 size={14} /> Run another simulation
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground />

      {/* spin keyframe injected inline for the loading spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Desktop resizable split */}
      <div ref={containerRef} className="hidden lg:flex h-[calc(100vh-7rem)] select-none">
        {/* LEFT PANEL */}
        <div
          ref={leftPanelRef}
          style={{ width: `${leftPct}%` }}
          className="overflow-y-auto p-6 lg:p-8 shrink-0"
        >
          {controlsContent}
        </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={startDrag}
          className="w-2 shrink-0 relative cursor-col-resize flex items-center justify-center group"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="absolute inset-y-0 left-0 right-0 group-hover:bg-violet-500/20 transition-colors" />
          <div className="relative z-10 opacity-30 group-hover:opacity-80 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* RIGHT PANEL: Map Preview */}
        <motion.div layoutId="live-map" className="flex-1 relative min-w-0" style={{ borderLeft: '1px solid var(--as-hairline)' }}>
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 20,
            background: 'var(--as-surface-1)', backdropFilter: 'blur(12px)',
            padding: '4px 12px', borderRadius: 999, border: '1px solid var(--as-hairline)',
            fontSize: '0.75rem', fontWeight: 600, color: simResult ? '#818cf8' : 'var(--text-muted)',
          }}>
            {approvedPlan ? '✓ Live Plan (approved)' : simResult ? '⚡ Simulated Preview' : 'Current Plan'}
          </div>
          <div className="w-full h-full min-h-[400px]">
            <MapView
              habitations={mapHabitations}
              sites={sites}
              currentPlan={mapPlan}
              routesData={routesData}
              selectedHab={null}
              onHabClick={() => {}}
              theme={theme || 'dark'}
            />
          </div>
        </motion.div>
      </div>

      {/* Mobile stacked */}
      <div className="lg:hidden flex flex-col">
        <div className="overflow-y-auto p-6">{controlsContent}</div>
        <div className="h-[350px]" style={{ borderTop: '1px solid var(--as-hairline)' }}>
          <MapView habitations={mapHabitations} sites={sites} currentPlan={mapPlan}
            routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
        </div>
      </div>
    </motion.div>
  );
};

export default WhatIfPage;
