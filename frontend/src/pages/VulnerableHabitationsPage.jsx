import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, HeartPulse, ChevronDown, Waves, Mountain,
  Database, FileWarning, Gauge,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import MeshBackground from "../components/MeshBackground";
import { NumberTicker } from "../components/ui/number-ticker";
import { MagicCard } from "../components/ui/magic-card";

const BAND_TINT = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#f59e0b",
  low: "#10b981",
};

const SORTS = {
  priority: { label: "Priority (highest first)", fn: (a, b) => b.priority_score - a.priority_score },
  population: { label: "Population (largest first)", fn: (a, b) => b.population - a.population },
  name: { label: "Name (A-Z)", fn: (a, b) => a.name.localeCompare(b.name) },
};

function ProvenanceRow({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
      <span style={{ color: "var(--as-text-tertiary)" }}>{label}</span>
      <span style={{ color: "var(--as-text-secondary)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function HabitationCard({ hab, index, isExpanded, onToggle }) {
  const tint = BAND_TINT[hab.red_zone_band] || "#94a3b8";
  const HazardIcon = hab.dominant_hazard === "landslide" ? Mountain : Waves;
  const floodProv = hab.hazard_provenance?.flood;
  const slideProv = hab.hazard_provenance?.landslide;
  const raw = hab.hazard_provenance?.raw_measurements;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.5) }}
      className="rounded-2xl overflow-hidden"
    >
      <MagicCard gradientColor={`${tint}22`} className="border-white/10 bg-white/[0.02]">
        <div className="relative z-10">
          <button
            onClick={onToggle}
            style={{ width: "100%", textAlign: "left", padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "none", border: "none", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span className="as-icon-tile as-icon-tile-tint" style={{ "--as-icon-tint": tint, flexShrink: 0 }}>
                <HazardIcon size={17} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3 className="as-heading" style={{ fontSize: "1rem", margin: 0 }}>{hab.name}</h3>
                  <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>{hab.habitation_id}</span>
                </div>
                <div className="as-small" style={{ color: "var(--as-text-tertiary)", marginTop: 2 }}>
                  Pop. {hab.population.toLocaleString()}
                  {hab.critical_care_population > 0 && (
                    <span style={{ color: "var(--ink-red-400)", marginLeft: 8 }}>
                      <HeartPulse size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />
                      {hab.critical_care_population} critical-care
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": tint }}>{hab.red_zone_band}</span>
              <ChevronDown size={16} style={{ color: "var(--as-text-tertiary)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "0 1.25rem 1.25rem 1.25rem", borderTop: "1px solid var(--as-hairline)", marginTop: 0, paddingTop: 14 }}>
                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    <div className="as-glass-quiet" style={{ padding: "0.75rem", borderRadius: 10 }}>
                      <div className="as-small" style={{ color: "var(--as-text-tertiary)" }}>Vulnerability</div>
                      <div className="as-numeric" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{hab.vulnerability_score.toFixed(2)}</div>
                    </div>
                    <div className="as-glass-quiet" style={{ padding: "0.75rem", borderRadius: 10 }}>
                      <div className="as-small" style={{ color: "var(--as-text-tertiary)" }}>Priority score</div>
                      <div className="as-numeric" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{hab.priority_score.toFixed(3)}</div>
                    </div>
                    <div className="as-glass-quiet" style={{ padding: "0.75rem", borderRadius: 10 }}>
                      <div className="as-small" style={{ color: "var(--as-text-tertiary)" }}>Classification stability</div>
                      <div className="as-numeric" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                        {hab.classification_stability != null ? `${Math.round(hab.classification_stability * 100)}%` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="as-small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                        <Waves size={12} /> Flood score: {hab.flood_score.toFixed(4)}
                      </div>
                      {floodProv?.signals_used?.length > 0 ? (
                        <>
                          {Object.entries(floodProv.terms || {}).map(([k, v]) => (
                            <ProvenanceRow key={k} label={k.replace(/_/g, " ")} value={v.toFixed(3)} />
                          ))}
                        </>
                      ) : (
                        <p className="as-small" style={{ color: "var(--as-text-tertiary)" }}>No derivation signals available - CSV fallback.</p>
                      )}
                      {raw?.distance_to_water_m != null && (
                        <ProvenanceRow label="Distance to water" value={`${(raw.distance_to_water_m / 1000).toFixed(1)} km (${raw.nearest_waterway})`} />
                      )}
                    </div>
                    <div>
                      <div className="as-small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                        <Mountain size={12} /> Landslide score: {hab.landslide_score.toFixed(4)}
                      </div>
                      {slideProv?.signals_used?.length > 0 ? (
                        Object.entries(slideProv.terms || {}).map(([k, v]) => (
                          <ProvenanceRow key={k} label={k.replace(/_/g, " ")} value={v.toFixed(3)} />
                        ))
                      ) : (
                        <p className="as-small" style={{ color: "var(--as-text-tertiary)" }}>No derivation signals available - CSV fallback.</p>
                      )}
                      {hab.ml_contribution_landslide && (
                        <ProvenanceRow label="ML susceptibility" value={`${(hab.ml_contribution_landslide.phi * 100).toFixed(1)}%`} />
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Database size={11} style={{ color: "var(--as-text-tertiary)" }} />
                    <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>
                      Hazard score source: <strong>{hab.hazard_score_source}</strong>
                    </span>
                  </div>
                  {hab.hazard_provenance?.non_claims_note && (
                    <p className="as-small" style={{ color: "var(--as-text-tertiary)", fontStyle: "italic", marginTop: 8 }}>
                      {hab.hazard_provenance.non_claims_note}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MagicCard>
    </motion.div>
  );
}

const VulnerableHabitationsPage = () => {
  const [habitations, setHabitations] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [sortKey, setSortKey] = useState("priority");

  useEffect(() => {
    fetch(`${API_BASE_URL}/habitations`).then(r => r.json()).then(setHabitations).catch(console.error);
  }, []);

  const sorted = useMemo(() => {
    return Object.values(habitations).sort(SORTS[sortKey].fn);
  }, [habitations, sortKey]);

  const totals = useMemo(() => {
    const list = Object.values(habitations);
    return {
      count: list.length,
      population: list.reduce((s, h) => s + h.population, 0),
      criticalCare: list.reduce((s, h) => s + (h.critical_care_population || 0), 0),
      critical: list.filter(h => h.red_zone_band === "critical").length,
    };
  }, [habitations]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 pb-24 px-6 md:px-8 relative overflow-hidden"
    >
      <MeshBackground variant="rose" />
      <div className="max-w-4xl mx-auto relative z-10">

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ "--as-icon-tint": "#f87171" }}>
            <ShieldAlert size={20} />
          </div>
          <h1 className="as-title mb-2">Vulnerable Habitations</h1>
          <p className="as-body text-[var(--as-text-tertiary)] max-w-2xl">
            Every habitation in the study area, with its population, vulnerability, and hazard
            breakdown. Expand any entry to see exactly which signals produced its score.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-7">
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Habitations</div>
            <div className="as-numeric text-xl font-bold"><NumberTicker value={totals.count} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Total population</div>
            <div className="as-numeric text-xl font-bold"><NumberTicker value={totals.population} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Critical-care</div>
            <div className="as-numeric text-xl font-bold text-red-400"><NumberTicker value={totals.criticalCare} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Critical band</div>
            <div className="as-numeric text-xl font-bold text-red-400"><NumberTicker value={totals.critical} /></div>
          </div>
        </motion.div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Gauge size={14} style={{ color: "var(--as-text-tertiary)" }} />
          <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            style={{ background: "var(--inner-bg)", border: "1px solid var(--as-hairline)", borderRadius: 8, color: "var(--as-text-secondary)", fontSize: 12.5, padding: "5px 10px" }}
          >
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="as-glass rounded-2xl p-12 text-center text-[var(--as-text-tertiary)]">
              <FileWarning className="mx-auto mb-3 opacity-50" size={28} />
              No habitation data loaded.
            </div>
          ) : (
            sorted.map((hab, i) => (
              <HabitationCard
                key={hab.habitation_id}
                hab={hab}
                index={i}
                isExpanded={expandedId === hab.habitation_id}
                onToggle={() => setExpandedId(expandedId === hab.habitation_id ? null : hab.habitation_id)}
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VulnerableHabitationsPage;
