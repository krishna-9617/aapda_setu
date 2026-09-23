import React from "react";
import { motion } from "framer-motion";
import {
  Info, Compass, Cpu, ShieldCheck, Database, Server, Layers, GitBranch,
  CheckCircle2, AlertTriangle, Building2,
} from "lucide-react";
import MeshBackground from "../components/MeshBackground";

const revealOnScroll = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] },
};

const STACK = [
  { layer: "Optimization", detail: "Google OR-Tools CP-SAT — a constraint solver, not a heuristic. It proves optimality or reports exactly how far a fallback plan is from it.", icon: Cpu },
  { layer: "Backend", detail: "FastAPI (Python) — the API, event handlers, and the geographic derivation pipeline all live here.", icon: Server },
  { layer: "Hazard derivation", detail: "rasterio, shapely, pyproj, osmnx/networkx — turn a DEM and a hydrography layer into a documented hazard score, when that data is available.", icon: Layers },
  { layer: "Frontend", detail: "React + Vite, Leaflet for the map, framer-motion for interaction.", icon: GitBranch },
];

const REAL_VS_ESTIMATED = [
  {
    kind: "real",
    title: "The optimizer's output",
    body: "Every assignment shown is what CP-SAT actually solved for, against the actual capacity, supply, and route constraints in the current dataset. The objective value, the solver status, and the optimality gap are all real solver output, not illustrative numbers.",
  },
  {
    kind: "real",
    title: "Hazard scores, when a derivation has been run",
    body: "Flood and landslide exposure computed from real elevation and hydrography data carries a provenance block naming every signal used, its weight, and anything that was unavailable. A habitation's score says exactly where it came from.",
  },
  {
    kind: "estimated",
    title: "Habitation and site coordinates",
    body: "The demonstration dataset's coordinates are estimated placements for Barpeta district, not a surveyed register of real households. Every derived number inherits this - a technically correct pipeline running on approximate points.",
  },
  {
    kind: "estimated",
    title: "Population and vulnerability figures",
    body: "Population counts and vulnerability scores in this demonstration dataset are illustrative, standing in for the kind of census and field-survey data a real deployment would use.",
  },
  {
    kind: "estimated",
    title: "The bundled ML susceptibility models",
    body: "A landslide model blends into the hazard score; a flood model does not currently run due to a feature-count mismatch, and is reported as inactive rather than papered over. Neither model's accuracy figures should be quoted without retraining on clean data.",
  },
];

function StackRow({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div {...revealOnScroll} transition={{ ...revealOnScroll.transition, delay: index * 0.06 }}
      className="as-glass-quiet" style={{ display: "flex", gap: 16, padding: "1.1rem 1.25rem", borderRadius: 14, alignItems: "flex-start" }}>
      <span className="as-icon-tile" style={{ flexShrink: 0 }}><Icon size={18} /></span>
      <div>
        <div className="as-small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.layer}</div>
        <p className="as-body" style={{ margin: 0 }}>{item.detail}</p>
      </div>
    </motion.div>
  );
}

function DataCard({ item, index }) {
  const isReal = item.kind === "real";
  const Icon = isReal ? CheckCircle2 : AlertTriangle;
  const tint = isReal ? "#34d399" : "#fbbf24";
  return (
    <motion.div {...revealOnScroll} transition={{ ...revealOnScroll.transition, delay: index * 0.05 }}
      className="as-glass" style={{ padding: "1.4rem", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={16} style={{ color: tint }} />
        <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": tint }}>
          {isReal ? "Real" : "Estimated / synthetic"}
        </span>
      </div>
      <h3 className="as-heading" style={{ marginBottom: 6 }}>{item.title}</h3>
      <p className="as-body" style={{ margin: 0 }}>{item.body}</p>
    </motion.div>
  );
}

import { API_BASE_URL } from "../config";

const AboutPage = () => {
  const [systemContext, setSystemContext] = React.useState(null);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/system/context`)
      .then(res => res.json())
      .then(data => setSystemContext(data))
      .catch(console.error);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 pb-24 px-6 md:px-8 relative overflow-hidden"
    >
      <MeshBackground variant="violet" />
      <div className="max-w-4xl mx-auto relative z-10">

        <motion.div {...revealOnScroll}>
          <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ "--as-icon-tint": "#a78bfa" }}>
            <Info size={20} />
          </div>
          <span className="as-eyebrow">About this project</span>
          <h1 className="as-display" style={{ marginTop: 8, marginBottom: 16 }}>
            What Aapda Setu actually does, and doesn't
          </h1>
          <p className="as-body" style={{ maxWidth: "42rem" }}>
            Aapda Setu is a decision-support prototype for disaster relocation, built for
            <strong> SIH 2026 &mdash; problem statement SIH26191</strong> (Ministry of Home Affairs,
            Disaster Management), with Barpeta district, Assam as its study area. It does not
            replace a district disaster management authority's judgement &mdash; it gives that
            authority a faster, more auditable way to reach a decision.
          </p>
        </motion.div>

        {/* Core principle */}
        <motion.section {...revealOnScroll} className="as-glass" style={{ marginTop: "2.5rem", padding: "2rem", borderRadius: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Compass size={18} className="text-indigo-400" />
            <h2 className="as-heading" style={{ margin: 0 }}>The core principle</h2>
          </div>
          <p className="as-body" style={{ marginBottom: "1.25rem" }}>
            Three steps, each done by whichever of a machine or a person is actually better
            suited to it:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Estimate the risk", body: "Hazard and vulnerability signals are combined into a score for every habitation, with the method behind that score always visible." },
              { step: "02", title: "Propose a feasible plan", body: "A constraint solver assigns people to shelters honoring capacity, supply, and route limits, and reports exactly how confident it is in the result." },
              { step: "03", title: "A human approves the action", body: "No plan reaches the field without a district officer's approval. Every version, rejected or approved, stays on the record." },
            ].map((s, i) => (
              <motion.div key={s.step} {...revealOnScroll} transition={{ ...revealOnScroll.transition, delay: i * 0.08 }}>
                <div className="as-numeric as-step-number" style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--as-accent)", opacity: 0.6, marginBottom: 6 }}>
                  {s.step}
                </div>
                <h3 className="as-heading" style={{ fontSize: "1rem", marginBottom: 6 }}>{s.title}</h3>
                <p className="as-body" style={{ margin: 0 }}>{s.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tech stack */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div className="flex items-center gap-2 mb-5">
            <Database size={18} className="text-indigo-400" />
            <h2 className="as-heading" style={{ margin: 0 }}>What it's built on</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {STACK.map((item, i) => <StackRow key={item.layer} item={item} index={i} />)}
          </div>
        </motion.section>

        {/* Real vs estimated */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-indigo-400" />
            <h2 className="as-heading" style={{ margin: 0 }}>What's real, and what's estimated</h2>
          </div>
          <p className="as-body" style={{ marginBottom: "1.5rem", maxWidth: "42rem" }}>
            A system built to inform decisions about people's safety should never blur this
            line. Here it's stated plainly rather than left for someone to discover later.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {REAL_VS_ESTIMATED.map((item, i) => <DataCard key={item.title} item={item} index={i} />)}
          </div>
        </motion.section>

        {systemContext && (
          <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={18} className="text-indigo-400" />
              <h2 className="as-heading" style={{ margin: 0 }}>Regional Disaster History</h2>
            </div>
            <p className="as-body text-[var(--as-text-tertiary)] max-w-2xl mb-4">
              {systemContext.historical_flood_context.flood_frequency}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {systemContext.historical_flood_context.recent_events.map((event, i) => (
                <div key={i} className="as-glass p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="as-small font-bold text-white/90">{event.year} Flood ({event.severity})</div>
                  </div>
                  <div className="as-small text-[var(--as-text-tertiary)] mb-2">
                    {event.peak_affected_note}
                  </div>
                  <div className="as-small text-indigo-400/80">Source: {event.source}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 mb-2 mt-8">
              <Building2 size={18} className="text-indigo-400" />
              <h2 className="as-heading" style={{ margin: 0 }}>Nearby Critical Infrastructure</h2>
            </div>
            <p className="as-body text-[var(--as-text-tertiary)] max-w-2xl mb-4">
              {systemContext.critical_infrastructure_near_sites.note}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {systemContext.critical_infrastructure_near_sites.hospitals_and_clinics.slice(0, 4).map((h, i) => (
                <div key={i} className="as-glass-quiet p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="as-small font-bold text-white/90">{h.name}</div>
                    {h.note && <div className="as-small text-[var(--as-text-tertiary)]">{h.note}</div>}
                  </div>
                  <div className="as-chip as-chip-muted ml-2">{h.type}</div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.div {...revealOnScroll} style={{ marginTop: "3rem", textAlign: "center" }}>
          <p className="as-small" style={{ color: "var(--as-text-tertiary)" }}>
            Built for SIH 2026 &mdash; Smart India Hackathon
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AboutPage;
