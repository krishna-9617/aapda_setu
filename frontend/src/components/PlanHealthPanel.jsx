
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../config";

const PlanHealthPanel = ({ currentPlan, onPlanUpdate }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPlan) {
      fetch(`${API_BASE_URL}/plans/health`)
        .then(res => res.json())
        .then(data => setHealthData(data))
        .catch(err => console.error("Failed to fetch plan health", err));
    }
  }, [currentPlan]);

  const handleApply = async (intervention) => {
    setLoading(true);
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
      if (!res.ok) {
        throw new Error("Failed to apply intervention");
      }
      const data = await res.json();
      onPlanUpdate(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!healthData) return null;

  const isHealthy = healthData.status === "HEALTHY";

  return (
    <div style={{
      backgroundColor: "var(--inner-bg)",
      padding: "16px",
      borderRadius: "12px",
      border: `1px solid ${isHealthy ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.4)"}`,
      marginTop: "20px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, color: "var(--text-strong)", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{isHealthy ? "🟢" : "🔴"}</span> Plan Health
          </h4>
        <div style={{
          backgroundColor: isHealthy ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
          color: isHealthy ? "#10b981" : "#f59e0b",
          padding: "4px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase"
        }}>
          {healthData.status}
        </div>
      </div>

      {!isHealthy && (
        <div style={{ marginBottom: "16px", fontSize: "13px", color: "var(--text-light)" }}>
          The current plan has <strong style={{ color: "var(--ink-red-500)" }}>{healthData.unmet_demand_total} unmet demand</strong>. 
          Optimization fell back to heuristic mode or constraints were relaxed.
        </div>
      )}

      {isHealthy && (
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          All demands are met. The optimization is fully solved.
        </div>
      )}

      {!isHealthy && healthData.interventions && healthData.interventions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Suggested Interventions:</div>
          <AnimatePresence>
            {healthData.interventions.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-strong)" }}>{inv.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{inv.description}</div>
                <div style={{ fontSize: "11px", color: "var(--ink-sky)", fontWeight: 600 }}>{inv.impact}</div>
                <button
                  onClick={() => handleApply(inv)}
                  disabled={loading}
                  style={{
                    marginTop: "4px",
                    padding: "6px",
                    backgroundColor: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "var(--ink-sky)",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "12px"
                  }}
                >
                  {loading ? "Applying..." : "Apply Intervention"}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PlanHealthPanel;

