import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2, GripVertical } from "lucide-react";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";

const PlanHealthPage = ({ theme }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [justApplied, setJustApplied] = useState(null);

  // Map data
  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});

  // Resizable panel
  const [leftPct, setLeftPct] = useState(45);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(75, (x / rect.width) * 100));
    setLeftPct(pct);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);

  const fetchAll = async () => {
    try {
      const [planRes, healthRes, habsRes, sitesRes, routesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/plans/current`),
        fetch(`${API_BASE_URL}/plans/health`),
        fetch(`${API_BASE_URL}/habitations`),
        fetch(`${API_BASE_URL}/sites`),
        fetch(`${API_BASE_URL}/routes`)
      ]);
      setCurrentPlan(await planRes.json());
      setHealthData(await healthRes.json());
      setHabitations(await habsRes.json());
      setSites(await sitesRes.json());
      setRoutesData(await routesRes.json());
    } catch (err) {
      console.error("Failed to fetch plan health data", err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApply = async (intervention) => {
    setLoading(true);
    setJustApplied(intervention.id);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/apply-intervention`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: intervention.type,
          site_id: intervention.site_id,
          resource_type: intervention.resource_type,
          amount: intervention.amount,
          habitation_id: intervention.habitation_id
        })
      });
      if (!res.ok) throw new Error("Failed to apply intervention");
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => setJustApplied(null), 3000);
  };

  if (!healthData) return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen p-8 pt-28 flex items-center justify-center"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </motion.div>
  );

  const isHealthy = healthData.status === "HEALTHY";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      {/* Success overlay */}
      <AnimatePresence>
        {justApplied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center p-8 bg-emerald-950/80 border border-emerald-500/30 rounded-3xl"
            >
              <CheckCircle2 size={80} className="text-emerald-400 mb-4" />
              <h2 className="text-2xl font-bold text-emerald-100">Intervention Applied!</h2>
              <p className="text-emerald-300/80 mt-2">Re-optimizing plan constraints...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split layout — desktop: resizable, mobile: stacked */}
      <div
        ref={containerRef}
        className="hidden lg:flex h-[calc(100vh-7rem)] select-none"
      >
        {/* LEFT PANEL */}
        <div
          style={{ width: `${leftPct}%` }}
          className="overflow-y-auto p-8 shrink-0"
        >
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
          <div className="relative z-10">
            {/* Status header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center mb-10 text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  boxShadow: isHealthy
                    ? ['0 0 0px rgba(16,185,129,0.2)', '0 0 30px rgba(16,185,129,0.4)', '0 0 0px rgba(16,185,129,0.2)']
                    : ['0 0 0px rgba(239,68,68,0.2)', '0 0 30px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0.2)']
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${
                  isHealthy
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {isHealthy
                  ? <ShieldCheck size={40} className="text-emerald-400" />
                  : <ShieldAlert size={40} className="text-red-400" />
                }
              </motion.div>

              <h1 className="text-3xl font-bold tracking-tight mb-3">
                Plan Status: <span className={isHealthy ? "text-emerald-400" : "text-red-400"}>{healthData.status}</span>
              </h1>

              <p className="text-sm text-slate-400 max-w-lg">
                {isHealthy
                  ? "All critical demands are met. The optimization model is fully solved."
                  : "The current plan has unmet demands. The solver has relaxed constraints to find a feasible solution."}
              </p>

              {!isHealthy && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/50 border border-red-800 text-red-300 text-sm">
                  <Activity className="w-4 h-4" />
                  {healthData.unmet_demand_total} Units of Unmet Demand
                </div>
              )}
            </motion.div>

            {/* Interventions */}
            {!isHealthy && healthData.interventions && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-white/10 pb-3">Recommended Interventions</h2>
                <div className="space-y-4">
                  <AnimatePresence>
                    {healthData.interventions.map((inv, idx) => (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.08 }}
                        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>
                        <p className="text-sm text-slate-400 mb-3">{inv.description}</p>

                        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-3 mb-4">
                          <p className="text-sm text-indigo-300 font-medium flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                            {inv.impact}
                          </p>
                        </div>

                        {justApplied === inv.id ? (
                          <div className="w-full py-2.5 flex items-center justify-center text-emerald-400 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                            <CheckCircle2 className="w-5 h-5 mr-2" /> Applied
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApply(inv)}
                            disabled={loading}
                            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? "Applying..." : "Apply Intervention"}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {isHealthy && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-slate-500 text-sm">No interventions needed — all demands are satisfied.</p>
              </div>
            )}
          </div>
        </div>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={startDrag}
          className="w-2 shrink-0 relative cursor-col-resize flex items-center justify-center group"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="absolute inset-y-0 left-0 right-0 group-hover:bg-indigo-500/20 transition-colors" />
          <div className="relative z-10 flex flex-col items-center gap-1 opacity-30 group-hover:opacity-80 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* RIGHT PANEL: Live Map */}
        <motion.div layoutId="live-map" className="flex-1 relative border-l border-white/10 min-w-0">
          <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-300">
            Live Plan View
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

      {/* MOBILE: stacked layout */}
      <div className="lg:hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${
              isHealthy ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              {isHealthy ? <ShieldCheck size={32} className="text-emerald-400" /> : <ShieldAlert size={32} className="text-red-400" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">Plan Status: <span className={isHealthy ? "text-emerald-400" : "text-red-400"}>{healthData.status}</span></h1>
            {!isHealthy && <div className="mt-2 text-sm text-red-300">{healthData.unmet_demand_total} units unmet demand</div>}
          </div>
          {!isHealthy && healthData.interventions && healthData.interventions.map((inv, idx) => (
            <div key={inv.id} className="p-4 mb-3 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="font-semibold text-white mb-1">{inv.title}</h3>
              <p className="text-sm text-slate-400 mb-3">{inv.description}</p>
              <button onClick={() => handleApply(inv)} disabled={loading}
                className="w-full py-2 rounded-lg bg-indigo-600/80 text-white text-sm font-semibold">
                Apply Intervention
              </button>
            </div>
          ))}
        </div>
        <div className="h-[350px] border-t border-white/10">
          <MapView habitations={habitations} sites={sites} currentPlan={currentPlan}
            routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
        </div>
      </div>
    </motion.div>
  );
};

export default PlanHealthPage;
