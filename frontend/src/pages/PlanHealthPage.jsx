import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2, GripVertical } from "lucide-react";
import Tilt3D from "../components/Tilt3D";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";
import ApprovalModal from "../components/ApprovalModal";
import MeshBackground from "../components/MeshBackground";
import { MagicCard } from "../components/ui/magic-card";

const PlanHealthPage = ({ theme }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [justApplied, setJustApplied] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);

  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});

  const [leftPct, setLeftPct] = useState(45);
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const isDragging = useRef(false);
  const liveLeftPct = useRef(45);

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
    const pct = Math.max(30, Math.min(60, ((e.clientX - rect.left) / rect.width) * 100));
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

  const fetchAll = async () => {
    try {
      const [hRes, habsRes, sitesRes, routesRes, planRes] = await Promise.all([
        fetch(`${API_BASE_URL}/plans/health`),
        fetch(`${API_BASE_URL}/habitations`),
        fetch(`${API_BASE_URL}/sites`),
        fetch(`${API_BASE_URL}/routes`),
        fetch(`${API_BASE_URL}/plans/current`)
      ]);
      setHealthData(await hRes.json());
      setHabitations(await habsRes.json());
      setSites(await sitesRes.json());
      setRoutesData(await routesRes.json());
      setCurrentPlan(await planRes.json());
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
      const result = await res.json();
      if (result?.plan) {
        setPendingResult(result);
      } else {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => setJustApplied(null), 3000);
  };

  const handleApprovePlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/approve`, { method: 'POST' });
      setPendingResult(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/reject`, { method: 'POST' });
      setPendingResult(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (!healthData) return (
    <div className="min-h-screen p-8 pt-28 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  const isHealthy = healthData.status === "HEALTHY";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground />

      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>

      <div ref={containerRef} className="hidden lg:flex h-[calc(100vh-7rem)] select-none">
        <div ref={leftPanelRef} style={{ width: leftPct + '%' }} className="overflow-y-auto shrink-0 p-6 lg:p-8">
          <div className="relative z-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-10 text-center">
              {/* A genuine 3D sphere rather than a flat glowing ring: a
                  radial highlight offset toward one corner (as if lit from
                  above-left) gives it real curvature, and the whole thing
                  tilts gently toward the cursor - more tactile than the
                  original flat badge, per the brief's own suggestion for
                  this exact element. */}
              <Tilt3D strength={10} style={{ marginBottom: 24 }}>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: isHealthy
                      ? ['0 0 0px rgba(16,185,129,0.2)', '0 0 30px rgba(16,185,129,0.4)', '0 0 0px rgba(16,185,129,0.2)']
                      : ['0 0 0px rgba(239,68,68,0.2)', '0 0 30px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0.2)']
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center border ${
                    isHealthy ? 'border-emerald-500/30' : 'border-red-500/30'
                  }`}
                  style={{
                    background: isHealthy
                      ? 'radial-gradient(circle at 32% 28%, rgba(52,211,153,0.55), rgba(16,185,129,0.12) 60%, rgba(6,78,59,0.08) 100%)'
                      : 'radial-gradient(circle at 32% 28%, rgba(248,113,113,0.55), rgba(239,68,68,0.12) 60%, rgba(69,10,10,0.08) 100%)',
                  }}
                >
                  {isHealthy ? <ShieldCheck size={40} className="text-emerald-400" /> : <ShieldAlert size={40} className="text-red-400" />}
                </motion.div>
              </Tilt3D>
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

            {!isHealthy && healthData.interventions && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-white/10 pb-3">Recommended Interventions</h2>
                <div className="space-y-4">
                  <AnimatePresence>
                    {healthData.interventions.map((inv, idx) => (
                      <motion.div key={inv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.08 }} className="rounded-xl overflow-hidden">
                        <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10">
                          <div className="relative z-10">
                            <h3 className="text-base font-semibold text-white light-text-strong mb-1">{inv.title}</h3>
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
                              <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(99,102,241,0.5)' }} onClick={() => handleApply(inv)} disabled={loading}
                                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? "Applying..." : "Apply Intervention"}
                              </motion.button>
                            )}
                          </div>
                        </MagicCard>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>

        <div onMouseDown={startDrag} className="w-2 shrink-0 relative cursor-col-resize flex items-center justify-center group" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <div className="absolute inset-y-0 left-0 right-0 group-hover:bg-indigo-500/20 transition-colors" />
          <div className="relative z-10 flex flex-col items-center gap-1 opacity-30 group-hover:opacity-80 transition-opacity">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <motion.div layoutId="live-map" className="flex-1 relative border-l border-white/10 min-w-0">
          <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-300 light-chip">
            Live Plan View
          </div>
          <div className="w-full h-full min-h-[400px]">
            <MapView habitations={habitations} sites={sites} currentPlan={currentPlan} routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
          </div>
        </motion.div>
      </div>

      <div className="lg:hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${isHealthy ? 'border-emerald-500/30' : 'border-red-500/30'}`}
              style={{
                background: isHealthy
                  ? 'radial-gradient(circle at 32% 28%, rgba(52,211,153,0.55), rgba(16,185,129,0.12) 60%, rgba(6,78,59,0.08) 100%)'
                  : 'radial-gradient(circle at 32% 28%, rgba(248,113,113,0.55), rgba(239,68,68,0.12) 60%, rgba(69,10,10,0.08) 100%)',
              }}>
              {isHealthy ? <ShieldCheck size={32} className="text-emerald-400" /> : <ShieldAlert size={32} className="text-red-400" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">Plan Status: <span className={isHealthy ? "text-emerald-400" : "text-red-400"}>{healthData.status}</span></h1>
            {!isHealthy && <div className="mt-2 text-sm text-red-300">{healthData.unmet_demand_total} units unmet demand</div>}
          </div>
          {!isHealthy && healthData.interventions && healthData.interventions.map((inv, idx) => (
            <div key={inv.id} className="p-4 mb-3 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="font-semibold text-white light-text-strong mb-1">{inv.title}</h3>
              <p className="text-sm text-slate-400 mb-3">{inv.description}</p>
              <button onClick={() => handleApply(inv)} disabled={loading} className="w-full py-2 rounded-lg bg-indigo-600/80 text-white text-sm font-semibold">
                Apply Intervention
              </button>
            </div>
          ))}
        </div>
        <div className="h-[350px] border-t border-white/10">
          <MapView habitations={habitations} sites={sites} currentPlan={currentPlan} routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
        </div>
      </div>
    </motion.div>
  );
};
export default PlanHealthPage;
