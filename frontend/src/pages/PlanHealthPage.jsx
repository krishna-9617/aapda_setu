import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "../config";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const PlanHealthPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [justApplied, setJustApplied] = useState(null);

  // Fetch current plan then health
  const fetchHealth = async () => {
    try {
      // First get current plan
      const planRes = await fetch(`${API_BASE_URL}/plans/current`);
      const planData = await planRes.json();
      setCurrentPlan(planData);

      // Then get health
      const healthRes = await fetch(`${API_BASE_URL}/plans/health`);
      const hData = await healthRes.json();
      setHealthData(hData);
    } catch (err) {
      console.error("Failed to fetch plan health", err);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

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
      
      // Refetch
      await fetchHealth();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => setJustApplied(null), 3000);
  };

  if (!healthData) return (
    <div className="min-h-screen bg-[#000000] text-slate-100 p-8 pt-24 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  const isHealthy = healthData.status === "HEALTHY";

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 p-8 pt-24 pb-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-16 text-center"
        >
          <div className="inline-flex items-center justify-center mb-6">
            {isHealthy ? (
              <motion.div 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                <ShieldCheck size={48} className="text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div 
                animate={{ boxShadow: ['0 0 20px rgba(239,68,68,0.2)', '0 0 50px rgba(239,68,68,0.6)', '0 0 20px rgba(239,68,68,0.2)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center"
              >
                <ShieldAlert size={48} className="text-red-400" />
              </motion.div>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Plan Status: <span className={isHealthy ? "text-emerald-400" : "text-red-400"}>{healthData.status}</span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-2xl">
            {isHealthy 
              ? "All critical demands are met. The optimization model is fully solved and operating within established parameters." 
              : `The current operational plan has unmet demands. The optimization solver has fallen back to heuristic mode or relaxed constraints to find a feasible solution.`}
          </p>

          {!isHealthy && (
            <Badge variant="destructive" className="mt-6 text-sm py-1.5 px-4 bg-red-950/50 border-red-800 text-red-300">
              <Activity className="w-4 h-4 mr-2" />
              {healthData.unmet_demand_total} Units of Unmet Demand
            </Badge>
          )}
        </motion.div>

        {!isHealthy && healthData.interventions && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold border-b border-white/10 pb-4">Recommended Interventions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {healthData.interventions.map((inv, idx) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="bg-white/[0.03] backdrop-blur-xl border-white/10 text-white shadow-2xl h-full flex flex-col hover:bg-white/[0.05] transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg">{inv.title}</CardTitle>
                        <CardDescription className="text-slate-400">{inv.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-4 mb-4">
                          <p className="text-sm text-indigo-300 font-medium flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                            {inv.impact}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter>
                        {justApplied === inv.id ? (
                          <div className="w-full py-2.5 flex items-center justify-center text-emerald-400 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                            <CheckCircle2 className="w-5 h-5 mr-2" /> Applied
                          </div>
                        ) : (
                          <ShimmerButton
                            onClick={() => handleApply(inv)}
                            className="w-full"
                            background="rgba(99, 102, 241, 0.2)"
                            shimmerColor="rgba(255,255,255,0.4)"
                          >
                            <span className="text-indigo-300 text-sm font-semibold tracking-wide">
                              {loading ? "Applying..." : "Apply Intervention"}
                            </span>
                          </ShimmerButton>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanHealthPage;
