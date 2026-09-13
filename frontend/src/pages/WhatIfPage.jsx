import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "../config";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Compare } from "@/components/ui/compare";

const WhatIfPage = () => {
  const [multiplier, setMultiplier] = useState([1.0]);
  const [hazardScore, setHazardScore] = useState([0.5]);
  const [selectedHabId, setSelectedHabId] = useState("GLOBAL");
  
  const [habitations, setHabitations] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/habitations`)
      .then(r => r.json())
      .then(d => setHabitations(d))
      .catch(e => console.error(e));
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const payload = { population_multiplier: multiplier[0] };
      if (selectedHabId !== "GLOBAL") {
        payload.target_habitation_id = selectedHabId;
        payload.hazard_score = hazardScore[0];
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
        alert("Scenario implemented successfully!");
        setSimResult(null);
      }
    } catch (e) {
      console.error(e);
    }
    setIsImplementing(false);
  };

  // We use Compare as a generic split-view comparison here
  const BaselineCard = () => (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center p-8 border-r border-white/10">
      <h3 className="text-slate-400 font-medium mb-2 tracking-widest text-sm uppercase">Baseline Plan</h3>
      <div className="text-4xl font-bold text-slate-100 mb-2">
        {simResult?.current_total_unmet_demand} <span className="text-xl text-slate-500 font-normal">Unmet</span>
      </div>
      <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
        Status: OPTIMAL
      </div>
    </div>
  );

  const SimulatedCard = () => (
    <div className="h-full w-full bg-indigo-950/40 flex flex-col items-center justify-center p-8">
      <h3 className="text-indigo-400 font-medium mb-2 tracking-widest text-sm uppercase">Simulated Outcome</h3>
      <div className="text-4xl font-bold text-white mb-2">
        {simResult?.total_unmet_demand} <span className="text-xl text-indigo-300 font-normal">Unmet</span>
      </div>
      <div className={`px-3 py-1 rounded-full text-sm border ${
        simResult?.solver_status === 'OPTIMAL' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
        simResult?.solver_status === 'INFEASIBLE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
        'bg-amber-500/10 text-amber-400 border-amber-500/20'
      }`}>
        Status: {simResult?.solver_status}
      </div>
      
      {simResult?.health?.interventions?.length > 0 && (
        <div className="mt-6 text-sm text-amber-400 bg-amber-500/10 p-3 rounded-md border border-amber-500/20 max-w-xs text-center">
          <span className="font-bold block mb-1">Warning:</span>
          {simResult.health.interventions.length} interventions recommended to resolve demand.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 p-8 pt-24 pb-20 relative overflow-hidden flex flex-col md:flex-row gap-8">
      {/* Background Glow */}
      <div className="absolute top-[10%] left-[40%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[150px] pointer-events-none" />

      {/* Left Column: Controls */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} 
        className="w-full md:w-[400px] shrink-0 z-10 flex flex-col gap-6"
      >
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-4">
            <Beaker className="text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">What-If Analysis</h1>
          <p className="text-slate-400 text-sm">
            Model hazard spikes and population surges in a sandbox environment before promoting to the live operational plan.
          </p>
        </div>

        <Card className="bg-white/[0.02] border-white/10 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg text-white">Scenario Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Target Area</label>
              <Select value={selectedHabId} onValueChange={setSelectedHabId}>
                <SelectTrigger className="bg-black/50 border-white/10 text-white">
                  <SelectValue placeholder="Select habitation" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="GLOBAL">Global Scenario (All Habitations)</SelectItem>
                  {Object.values(habitations).map(hab => (
                    <SelectItem key={hab.habitation_id} value={hab.habitation_id}>
                      {hab.name} ({hab.habitation_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Population Surge</label>
                <span className="text-violet-400 font-semibold text-sm">+{((multiplier[0] - 1) * 100).toFixed(0)}%</span>
              </div>
              <Slider 
                value={multiplier} 
                onValueChange={setMultiplier} 
                min={1.0} max={2.0} step={0.1}
                className="[&_[role=slider]]:bg-violet-500"
              />
            </div>

            {selectedHabId !== "GLOBAL" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">Target Hazard Score</label>
                  <span className="text-violet-400 font-semibold text-sm">{hazardScore[0].toFixed(2)}</span>
                </div>
                <Slider 
                  value={hazardScore} 
                  onValueChange={setHazardScore} 
                  min={0.1} max={1.0} step={0.05}
                  className="[&_[role=slider]]:bg-violet-500"
                />
              </div>
            )}

            <ShimmerButton
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full mt-4"
              background="rgba(139, 92, 246, 0.2)"
              shimmerColor="rgba(255,255,255,0.5)"
            >
              <span className="text-violet-300 font-semibold flex items-center gap-2">
                {isSimulating ? "Simulating..." : <><Play className="w-4 h-4" /> Run Simulation</>}
              </span>
            </ShimmerButton>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right Column: Results */}
      <div className="flex-1 z-10 flex flex-col">
        <AnimatePresence mode="wait">
          {!simResult ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]"
            >
              <Beaker className="w-16 h-16 text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium">Configure parameters and run simulation to view impact.</p>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col h-full gap-6"
            >
              <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative h-[400px]">
                <Compare 
                  firstImage={<BaselineCard />}
                  secondImage={<SimulatedCard />}
                  firstImageClassName="object-cover"
                  secondImageClassname="object-cover"
                  className="w-full h-full"
                  slideMode="hover"
                />
                
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-300 z-50">
                  Hover or drag to compare
                </div>
              </div>

              <div className="flex justify-end">
                <ShimmerButton
                  onClick={implementScenario}
                  disabled={isImplementing}
                  background="rgba(16, 185, 129, 0.2)"
                  shimmerColor="rgba(255,255,255,0.5)"
                >
                  <span className="text-emerald-300 font-semibold flex items-center gap-2 px-4">
                    {isImplementing ? "Implementing..." : <><CheckCircle2 className="w-5 h-5" /> Implement This Scenario</>}
                  </span>
                </ShimmerButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WhatIfPage;
