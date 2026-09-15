import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, Play, CheckCircle2, GripVertical } from "lucide-react";
import { API_BASE_URL } from "../config";
import MapView from "../components/MapView";

const WhatIfPage = ({ theme }) => {
  const [multiplier, setMultiplier] = useState(1.0);
  const [hazardScore, setHazardScore] = useState(0.5);
  const [selectedHabId, setSelectedHabId] = useState("GLOBAL");

  const [habitations, setHabitations] = useState({});
  const [sites, setSites] = useState({});
  const [routesData, setRoutesData] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Resizable panel
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const isDragging = useRef(false);
  const liveLeftPct = useRef(40);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

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
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);
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
    } catch (e) {
      console.error(e);
    }
    setIsSimulating(false);
  };

  const implementScenario = async () => {
    if (!simResult?.simulated_pending_plan) return;
    setIsImplementing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/implement-what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulated_pending_plan: simResult.simulated_pending_plan,
          simulated_data: simResult.simulated_data
        })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        alert("Scenario implemented successfully! Redirecting to Dashboard.");
        setSimResult(null);
        const planRes = await fetch(`${API_BASE_URL}/plans/current`);
        setCurrentPlan(await planRes.json());
      }
    } catch (e) {
      console.error(e);
    }
    setIsImplementing(false);
  };

  const mapHabitations = simResult?.simulated_data?.habitations || habitations;
  const mapPlan = simResult?.simulated_pending_plan || currentPlan;
  const surgePercent = Math.round((multiplier - 1) * 100);

  const controlsContent = (
    <div className="relative z-10 space-y-6">
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[150px] pointer-events-none" />

      {/* Header */}
      <div>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-4">
          <Beaker className="text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2">What-If Analysis</h1>
        <p className="text-slate-400 text-sm">
          Model hazard spikes and population surges in a sandbox before promoting to the live plan.
        </p>
      </div>

      {/* Scenario Parameters */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-sm space-y-6">
        <h3 className="text-base font-semibold text-white">Scenario Parameters</h3>

        {/* Target Area */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Target Area</label>
          <select
            value={selectedHabId}
            onChange={e => setSelectedHabId(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-colors"
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
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">Population Surge</label>
            <span className="text-violet-400 font-semibold text-sm">+{surgePercent}%</span>
          </div>
          <input
            type="range"
            min={1.0} max={2.0} step={0.1}
            value={multiplier}
            onChange={e => setMultiplier(parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>

        {/* Hazard Score (conditional) */}
        {selectedHabId !== "GLOBAL" && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">Target Hazard Score</label>
              <span className="text-violet-400 font-semibold text-sm">{hazardScore.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1} max={1.0} step={0.05}
              value={hazardScore}
              onChange={e => setHazardScore(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
        )}

        {/* Run button */}
        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className="w-full py-3 px-4 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSimulating ? "Simulating..." : <><Play className="w-4 h-4" /> Run Simulation</>}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {!simResult ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]"
          >
            <Beaker className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">Run a simulation to see impact.</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Baseline vs Simulated cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 text-center">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Baseline</h4>
                <motion.div
                  key={simResult.current_total_unmet_demand}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-slate-100 mb-1"
                >
                  {simResult.current_total_unmet_demand ?? 0}
                </motion.div>
                <p className="text-xs text-slate-500">Unmet Demand</p>
              </div>

              <div className={`p-4 rounded-xl border text-center ${
                simResult.solver_status === 'OPTIMAL'
                  ? 'bg-emerald-950/30 border-emerald-500/20'
                  : simResult.solver_status === 'INFEASIBLE'
                  ? 'bg-red-950/30 border-red-500/20'
                  : 'bg-amber-950/30 border-amber-500/20'
              }`}>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Simulated</h4>
                <motion.div
                  key={simResult.total_unmet_demand}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {simResult.total_unmet_demand ?? 0}
                </motion.div>
                <p className="text-xs text-slate-500">Unmet Demand</p>
                <p className={`text-xs mt-1 font-medium ${
                  simResult.solver_status === 'OPTIMAL' ? 'text-emerald-400' :
                  simResult.solver_status === 'INFEASIBLE' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {simResult.solver_status}
                </p>
              </div>
            </div>

            {/* Change indicator */}
            {simResult.current_total_unmet_demand !== undefined && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-400">Unmet demand change:</span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`font-bold ${
                    (simResult.total_unmet_demand || 0) > (simResult.current_total_unmet_demand || 0)
                      ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {(simResult.total_unmet_demand || 0) - (simResult.current_total_unmet_demand || 0) >= 0 ? '+' : ''}
                  {(simResult.total_unmet_demand || 0) - (simResult.current_total_unmet_demand || 0)}
                </motion.span>
              </div>
            )}

            {/* Warnings */}
            {simResult.health?.interventions?.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 text-center">
                <strong>Warning:</strong> {simResult.health.interventions.length} interventions recommended.
              </div>
            )}

            {/* Implement button */}
            <button
              onClick={implementScenario}
              disabled={isImplementing}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImplementing ? "Implementing..." : <><CheckCircle2 className="w-5 h-5" /> Implement This Scenario</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >
      {/* Desktop resizable split */}
      <div ref={containerRef} className="hidden lg:flex h-[calc(100vh-7rem)] select-none">
        {/* LEFT PANEL */}
        <div
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
        <motion.div layoutId="live-map" className="flex-1 relative border-l border-white/10 min-w-0">
          <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-medium text-violet-300">
            {simResult ? "⚡ Simulated Preview" : "Current Plan"}
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
        <div className="h-[350px] border-t border-white/10">
          <MapView habitations={mapHabitations} sites={sites} currentPlan={mapPlan}
            routesData={routesData} selectedHab={null} onHabClick={() => {}} theme={theme || 'dark'} />
        </div>
      </div>
    </motion.div>
  );
};

export default WhatIfPage;
