import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Droplet, Utensils, Stethoscope, ShieldCheck, ShieldX,
  HeartPulse, Info
} from "lucide-react";
import { API_BASE_URL } from "../config";
import MeshBackground from "../components/MeshBackground";
import { NumberTicker } from "../components/ui/number-ticker";
import { MagicCard } from "../components/ui/magic-card";

const RESOURCES = [
  { key: "capacity_space", label: "Space", icon: Building2, unit: "" },
  { key: "capacity_water", label: "Water", icon: Droplet, unit: "" },
  { key: "capacity_food", label: "Food", icon: Utensils, unit: "" },
  { key: "capacity_health", label: "Health", icon: Stethoscope, unit: "" },
];

function OccupancyBar({ used, capacity }) {
  const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
  const tint = pct >= 95 ? "#ef4444" : pct >= 75 ? "#f59e0b" : "#34d399";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>Live occupancy</span>
        <span className="as-numeric" style={{ fontSize: 12, fontWeight: 700, color: tint }}>
          {used.toLocaleString()} / {capacity.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          style={{ height: "100%", background: tint, borderRadius: 999 }}
        />
      </div>
    </div>
  );
}

function SiteCard({ site, occupied, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.5) }}
      className="rounded-2xl overflow-hidden h-full"
    >
      <MagicCard gradientColor="rgba(129,140,248,0.14)" className="border-white/10 bg-white/[0.02] h-full">
        <div className="relative z-10 p-5 flex flex-col gap-4 h-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 className="as-heading" style={{ fontSize: "1.05rem", marginBottom: 2 }}>{site.name}</h3>
              <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>{site.site_id}</span>
            </div>
            {site.has_healthcare ? (
              <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": "#34d399" }} title="Has on-site healthcare">
                <HeartPulse size={10} style={{ marginRight: 3 }} /> Healthcare
              </span>
            ) : (
              <span className="as-chip as-chip-muted" style={{ opacity: 0.6 }}>No healthcare</span>
            )}
          </div>

          <OccupancyBar used={occupied} capacity={site.effective_capacity} />

          <div className="grid grid-cols-2 gap-2">
            {RESOURCES.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.key} className="as-glass-quiet" style={{ padding: "0.5rem 0.65rem", borderRadius: 9, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={13} style={{ color: "var(--as-accent)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="as-small" style={{ color: "var(--as-text-tertiary)", fontSize: 10, lineHeight: 1.2 }}>{r.label}</div>
                    <div className="as-numeric" style={{ fontWeight: 700, fontSize: 12.5 }}>{site[r.key]?.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 6, borderTop: "1px solid var(--as-hairline)" }}>
            <span className="as-small" style={{ display: "flex", alignItems: "center", gap: 4, color: site.safety_flag ? "#34d399" : "#f87171" }}>
              {site.safety_flag ? <ShieldCheck size={12} /> : <ShieldX size={12} />} {site.safety_flag ? "Safe" : "Flagged"}
            </span>
            <span className="as-small" style={{ color: "var(--as-text-tertiary)" }}>
              Food supply: {site.food_supply_units?.toLocaleString()}
            </span>
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}

const RelocationSitesPage = () => {
  const [sites, setSites] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  const [systemContext, setSystemContext] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/sites`).then(r => r.json()),
      fetch(`${API_BASE_URL}/plans/current`).then(r => r.json()),
      fetch(`${API_BASE_URL}/system/context`).then(r => r.json()),
    ]).then(([sitesData, planData, contextData]) => {
      setSites(sitesData);
      setCurrentPlan(planData);
      setSystemContext(contextData);
    }).catch(console.error);
  }, []);

  const occupancyBySite = useMemo(() => {
    const map = {};
    (currentPlan?.assignments || []).forEach(a => {
      map[a.site_id] = (map[a.site_id] || 0) + a.people_count;
    });
    return map;
  }, [currentPlan]);

  const totals = useMemo(() => {
    const list = Object.values(sites);
    const occupied = Object.values(occupancyBySite).reduce((s, v) => s + v, 0);
    return {
      count: list.length,
      capacity: list.reduce((s, site) => s + (site.effective_capacity || 0), 0),
      occupied,
      withHealthcare: list.filter(s => s.has_healthcare).length,
    };
  }, [sites, occupancyBySite]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 pb-24 px-6 md:px-8 relative overflow-hidden"
    >
      <MeshBackground variant="emerald" />
      <div className="max-w-6xl mx-auto relative z-10">

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ "--as-icon-tint": "#34d399" }}>
            <Building2 size={20} />
          </div>
          <h1 className="as-title mb-2">Relocation Sites</h1>
          <p className="as-body text-[var(--as-text-tertiary)] max-w-2xl">
            Every shelter site in the network, its capacity across space, water, food and
            health resources, and how much of that capacity the current plan is using.
          </p>
          {systemContext?.shelter_capacity_standard && (
            <div className="as-glass-quiet mt-4 rounded-xl px-4 py-3 border border-white/5" style={{ maxWidth: "42rem" }}>
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="as-small text-[var(--as-text-secondary)] font-semibold mb-1">
                    Capacity cross-checked against {systemContext.shelter_capacity_standard.standard}
                  </div>
                  <div className="as-small text-[var(--as-text-tertiary)] leading-tight">
                    {systemContext.shelter_capacity_standard.covered_area_per_person_sqm} sq.m per person covered area (standard).
                    COVID-19 revision: {systemContext.shelter_capacity_standard.covid_assam_revision_sqm} sq.m. 
                    <a href="https://ndma.gov.in" target="_blank" rel="noreferrer" className="ml-2 text-indigo-400 hover:underline">Citation</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-7">
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Sites</div>
            <div className="as-numeric text-xl font-bold"><NumberTicker value={totals.count} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Total capacity</div>
            <div className="as-numeric text-xl font-bold"><NumberTicker value={totals.capacity} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Currently occupied</div>
            <div className="as-numeric text-xl font-bold text-sky-400"><NumberTicker value={totals.occupied} /></div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">With healthcare</div>
            <div className="as-numeric text-xl font-bold text-emerald-400"><NumberTicker value={totals.withHealthcare} /></div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(sites).map((site, i) => (
            <SiteCard key={site.site_id} site={site} occupied={occupancyBySite[site.site_id] || 0} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default RelocationSitesPage;
