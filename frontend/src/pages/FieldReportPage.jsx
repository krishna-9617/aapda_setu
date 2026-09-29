import ApprovalModal from '../components/ApprovalModal';
import PostApprovalSummary from '../components/PostApprovalSummary';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Radio, CheckCircle2, Zap, Droplets, Building2, RefreshCw,
  GripVertical, ChevronRight,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";
import { MagicCard } from "../components/ui/magic-card";
import MeshBackground from "../components/MeshBackground";

// Incident types the field can report. Each maps 1:1 onto an existing
// handler/endpoint below - this array only decides how they are PRESENTED
// (as a single-choice selector instead of four always-visible cards), it
// does not change what happens when one is triggered.
const INCIDENT_TYPES = [
  { id: 'reset', label: 'Reset', icon: RefreshCw, tint: '#34d399' },
  { id: 'rainfall', label: 'Rainfall', icon: Droplets, tint: '#38bdf8' },
  { id: 'bridge', label: 'Bridge Collapse', icon: Zap, tint: '#f87171' },
  { id: 'capacity', label: 'Capacity Drop', icon: Building2, tint: '#fb923c' },
];

const FieldReportPage = ({ theme }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingResult, setPendingResult] = useState(null);
  const [eventSummary, setEventSummary] = useState(null);

  // Which incident-type panel is active. Purely presentational state - new
  // in this redesign - it only decides which of the panels below is shown;
  // none of the report handlers depend on it.
  const [activeType, setActiveType] = useState('reset');

  // Dropdowns
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [dropPercent, setDropPercent] = useState(0.5);

  // Map data
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);

  // ── Smooth resizable split (ref-based DOM mutation during drag) ──────────
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const isDragging = useRef(false);
  const liveLeftPct = useRef(40);

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
    const pct = Math.max(25, Math.min(65, ((e.clientX - rect.left) / rect.width) * 100));
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toast = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); }
  };

  const callEvent = async (fn) => {
    setLoading(true);
    setErrorMsg(""); setSuccessMsg("");
    try {
      const result = await fn();
      if (result?.plan) {
        setPendingResult(result);
        toast("Incident reported — new plan pending approval.");
      } else {
        toast("Baseline optimization complete.");
      }
      await fetchData();
    } catch (e) {
      toast(e.message, true);
    }
    setLoading(false);
  };

  const handleApprovePlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/approve`, { method: 'POST' });
      const summaryData = { ...pendingResult };
      setPendingResult(null);
      setSuccessMsg(""); // drop the 'pending approval' toast so it cannot stack behind the summary

      // Fetch mock alerts (moved here, unchanged, from the Dashboard's approval flow)
      try {
        const alertsRes = await fetch(`${API_BASE_URL}/alerts/sent`);
        const alertsData = await alertsRes.json();
        summaryData.alerts = alertsData.alerts;
      } catch (err) {
        console.error("Failed to fetch alerts", err);
      }

      await fetchData();

      // Post-approval summary + SMS Alerts Dispatched card (replaces the bare "Plan approved and applied." toast)
      setEventSummary(summaryData);
      setTimeout(() => setEventSummary(null), 12000);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to approve plan.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/reject`, { method: 'POST' });
      setPendingResult(null);
      setErrorMsg("Plan rejected. Current plan unchanged.");
      setTimeout(() => setErrorMsg(""), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBaseline = () => callEvent(async () => {
    const res = await fetch(`${API_BASE_URL}/plans/optimize`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
    return null;
  });

  const handleRainfallEvent = (intensity) => callEvent(async () => {
    const res = await fetch(`${API_BASE_URL}/events/rainfall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intensity })
    });
    if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
    return await res.json();
  });

  const handleBridgeCollapse = () => {
    if (!selectedRouteId) { toast("Please select a route first.", true); return; }
    callEvent(async () => {
      const res = await fetch(`${API_BASE_URL}/field-reports/hazard-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_type: "bridge_collapse", target_id: selectedRouteId, reported_by: "Field Officer" })
      });
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
      return await res.json();
    });
  };

  const handleCapacityDrop = () => {
    if (!selectedSiteId) { toast("Please select a site first.", true); return; }
    callEvent(async () => {
      const res = await fetch(`${API_BASE_URL}/field-reports/hazard-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_type: "capacity_drop", target_id: selectedSiteId, drop_percent: dropPercent, reported_by: "Field Officer" })
      });
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
      return await res.json();
    });
  };

  const selectCls = "w-full p-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-orange-500/50 transition-colors light-select";

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };
  const panelVariants = {
    hidden: { opacity: 0, x: 12 },
    show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
  };

  const activeMeta = INCIDENT_TYPES.find(t => t.id === activeType);

  const controlsContent = (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ '--as-icon-tint': '#fb923c' }}>
          <Radio size={20} />
        </div>
        <h1 className="as-title mb-2">Field Incident Reporting</h1>
        <p className="as-body text-[var(--as-text-tertiary)]">
          Choose an incident type below. Each report triggers a CP-SAT re-optimization
          that waits for your approval before it touches the live plan.
        </p>
      </motion.div>

      {/* Pending plan badge */}
      <AnimatePresence>
        {pendingResult && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold text-sm mb-1">New Plan Pending Approval</p>
              <p className="text-amber-400/70 text-xs">An approval modal should be visible — approve or reject to continue.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incident-type selector: one choice at a time, not four stacked
          forms. The active pill gets a shared layoutId highlight that slides
          between positions rather than popping. */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Incident type">
        {INCIDENT_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = type.id === activeType;
          return (
            <button
              key={type.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveType(type.id)}
              className="relative items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold transition-colors as-interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                color: isActive ? type.tint : 'var(--as-text-tertiary)',
                border: `1px solid ${isActive ? 'var(--as-hairline-strong)' : 'var(--as-hairline)'}`,
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="incident-tab-highlight"
                  className="absolute inset-0 rounded-xl -z-10"
                  style={{ background: `color-mix(in srgb, ${type.tint} 14%, transparent)` }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="w-4 h-4" />
              <span className="text-center leading-tight">{type.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Active panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeType}
          variants={panelVariants}
          initial="hidden" animate="show" exit="exit"
          className="rounded-xl overflow-hidden"
        >
          <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10">
            <div className="relative z-10 space-y-3">
              <h3 className="text-sm font-semibold text-white light-text-strong flex items-center gap-2">
                <activeMeta.icon className="w-4 h-4" style={{ color: activeMeta.tint }} />
                {activeMeta.label}
              </h3>

              {activeType === 'reset' && (
                <>
                  <p className="text-xs text-slate-500">Re-optimize from the current ground truth with no simulated incidents.</p>
                  <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(16,185,129,0.5)' }} onClick={handleBaseline} disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? "Processing..." : <><RefreshCw className="w-4 h-4" /> Reset to Fresh Baseline</>}
                  </motion.button>
                </>
              )}

              {activeType === 'rainfall' && (
                <>
                  <p className="text-xs text-slate-500">Simulate rainfall that raises hazard scores across habitations.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: 'Light', val: 0.3, color: 'sky' }, { label: 'Moderate', val: 0.6, color: 'amber' }, { label: 'Severe', val: 0.9, color: 'red' }].map(r => (
                      <motion.button whileHover={{ scale: 1.05 }} key={r.val} onClick={() => handleRainfallEvent(r.val)} disabled={loading}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50
                          ${r.color === 'sky' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20' :
                            r.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20' :
                              'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'}`}>
                        {r.label}<br /><span className="text-[10px] opacity-70 as-dim-relax">Intensity {r.val}</span>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {activeType === 'bridge' && (
                <>
                  <p className="text-xs text-slate-500">Report a route blocked by structural failure. Triggers re-routing away from that link.</p>
                  <select value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)} className={selectCls}>
                    <option value="" disabled>Select a route…</option>
                    {Object.values(routesData).map(r => {
                      const habName = habitations[r.from_habitation_id]?.name || r.from_habitation_id;
                      const siteName = sites[r.to_site_id]?.name || r.to_site_id;
                      return <option key={r.route_id} value={r.route_id}>{r.route_id} — {habName} → {siteName}</option>;
                    })}
                  </select>
                  <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(239,68,68,0.5)' }} onClick={handleBridgeCollapse} disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" /> Report Bridge Collapse
                  </motion.button>
                </>
              )}

              {activeType === 'capacity' && (
                <>
                  <p className="text-xs text-slate-500">Report a shelter losing capacity (flooding, structural damage, etc.).</p>
                  <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)} className={selectCls}>
                    <option value="" disabled>Select a shelter site…</option>
                    {Object.values(sites).map(s => (
                      <option key={s.site_id} value={s.site_id}>{s.site_id} — {s.name}</option>
                    ))}
                  </select>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Capacity Reduction</span>
                      <span className="text-orange-400 font-semibold">{Math.round(dropPercent * 100)}%</span>
                    </div>
                    <input type="range" min={0.1} max={0.9} step={0.05} value={dropPercent}
                      onChange={e => setDropPercent(parseFloat(e.target.value))}
                      className="w-full accent-orange-500" />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                      <span>10%</span><span>90%</span>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(249,115,22,0.5)' }} onClick={handleCapacityDrop} disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-orange-600/80 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Building2 className="w-4 h-4" /> Report Capacity Drop
                  </motion.button>
                </>
              )}
            </div>
          </MagicCard>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground variant="orange" />

      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>

      <PostApprovalSummary summary={eventSummary} onClose={() => setEventSummary(null)} position="fixed" maxWidth="460px" />

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-red-950/90 border border-red-500/40 text-red-300 text-sm font-medium shadow-2xl backdrop-blur-md">
            {errorMsg}
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-sm font-medium shadow-2xl backdrop-blur-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop resizable split ── */}
      <div ref={containerRef} className="hidden lg:flex h-[calc(100vh-7rem)] select-none">
        <div ref={leftPanelRef} style={{ width: leftPct + '%' }} className="overflow-y-auto p-8 shrink-0">
          {controlsContent}
        </div>
        <div onMouseDown={startDrag} className="w-2 shrink-0 relative cursor-col-resize flex items-center justify-center group" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <div className="absolute inset-y-0 left-0 right-0 group-hover:bg-orange-500/20 transition-colors" />
          <div className="relative z-10 opacity-30 group-hover:opacity-80 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <motion.div layoutId="field-map" className="flex-1 relative border-l border-white/10 min-w-0">
          <div className="w-full h-full min-h-[400px]">
            <MapView habitations={habitations} sites={sites} currentPlan={currentPlan} routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
          </div>
        </motion.div>
      </div>
      {/* ── Mobile stacked ── */}
      <div className="lg:hidden flex flex-col">
        <div className="overflow-y-auto p-6">{controlsContent}</div>
        <div className="h-[350px] border-t border-white/10">
          <MapView habitations={habitations} sites={sites} currentPlan={currentPlan} routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
        </div>
      </div>
    </motion.div>
  );
};
export default FieldReportPage;
