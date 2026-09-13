import ApprovalModal from '../components/ApprovalModal';
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Radio, CheckCircle2, Zap, Droplets, Building2, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";

const FieldReportPage = ({ theme }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingResult, setPendingResult] = useState(null);

  // Dropdowns
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [dropPercent, setDropPercent] = useState(0.5);

  // Map data
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);

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
        toast("Incident reported — new plan pending approval on Dashboard.");
      } else {
        toast("Baseline optimization complete.");
      }
      await fetchData();
    } catch (e) {
      toast(e.message, true);
    }
    setLoading(false);
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
        body: JSON.stringify({ incident_type: "bridge_collapse", target_id: selectedRouteId, reported_by: "Field Officer — Field Report Page" })
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
        body: JSON.stringify({ incident_type: "capacity_drop", target_id: selectedSiteId, drop_percent: dropPercent, reported_by: "Field Officer — Field Report Page" })
      });
      if (!res.ok) throw new Error((await res.json()).detail || `Error ${res.status}`);
      return await res.json();
    });
  };

  const selectCls = "w-full p-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-orange-500/50 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-[5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-orange-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />

      
      {/* Approval Modal from Dashboard */}
      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal 
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>
  
      {/* Toast messages */}
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

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)]">
        {/* LEFT PANEL: Controls */}
        <div className="lg:w-[40%] w-full overflow-y-auto p-6 lg:p-8 relative z-10 space-y-6">
          {/* Header */}
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-4">
              <Radio className="text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Field Incident Reporting</h1>
            <p className="text-slate-400 text-sm">
              Report infrastructure disruptions and hazard events directly from the field. Each report triggers a CP-SAT re-optimization with human approval.
            </p>
          </div>

          {/* Pending plan badge */}
          <AnimatePresence>
            {pendingResult && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-semibold text-sm mb-1">New Plan Pending Approval</p>
                  <p className="text-amber-400/70 text-xs">Head to the Live Dashboard to review and approve or reject the proposed re-plan.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset Baseline */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-400" /> System Reset</h3>
            <p className="text-xs text-slate-500">Re-optimize from the current ground truth with no simulated incidents.</p>
            <button onClick={handleBaseline} disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "Processing..." : <><RefreshCw className="w-4 h-4" /> Reset to Fresh Baseline</>}
            </button>
          </div>

          {/* Rainfall Events */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Droplets className="w-4 h-4 text-sky-400" /> Rainfall Event</h3>
            <p className="text-xs text-slate-500">Simulate rainfall that raises hazard scores across habitations.</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: 'Light', val: 0.3, color: 'sky' }, { label: 'Moderate', val: 0.6, color: 'amber' }, { label: 'Severe', val: 0.9, color: 'red' }].map(r => (
                <button key={r.val} onClick={() => handleRainfallEvent(r.val)} disabled={loading}
                  className={`py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50
                    ${r.color === 'sky' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20' :
                      r.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20' :
                        'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'}`}>
                  {r.label}<br /><span className="text-[10px] opacity-70">Intensity {r.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bridge Collapse */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-red-400" /> Bridge Collapse</h3>
            <p className="text-xs text-slate-500">Report a route blocked by structural failure. Triggers re-routing away from that link.</p>
            <select value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)} className={selectCls}>
              <option value="" disabled>Select a route…</option>
              {Object.values(routesData).map(r => {
                const habName = habitations[r.from_habitation_id]?.name || r.from_habitation_id;
                const siteName = sites[r.to_site_id]?.name || r.to_site_id;
                return <option key={r.route_id} value={r.route_id}>{r.route_id} — {habName} → {siteName}</option>;
              })}
            </select>
            <button onClick={handleBridgeCollapse} disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Report Bridge Collapse
            </button>
          </div>

          {/* Capacity Drop */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-orange-400" /> Shelter Capacity Drop</h3>
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
            <button onClick={handleCapacityDrop} disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600/80 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" /> Report Capacity Drop
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Live Map */}
        <motion.div layoutId="live-map" className="lg:w-[60%] w-full relative border-l border-white/10">
          <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-orange-300">
            Live Operations Map
          </div>
          <div className="w-full h-full min-h-[400px]">
            <MapView
              habitations={habitations}
              sites={sites}
              currentPlan={currentPlan}
              routesData={routesData}
              selectedHab={null}
              onHabClick={() => {}}
              theme={theme || 'dark'}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FieldReportPage;
