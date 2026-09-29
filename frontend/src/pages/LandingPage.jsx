import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ChevronRight, Cpu, Database, Users, Route, Brain, ShieldCheck, Activity } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import ModuleOverview from "@/components/ModuleOverview";
import NetworkMesh3D from "@/components/NetworkMesh3D";

/*
 * Landing page.
 *
 * Every colour and spacing value comes from the shared design system in
 * styles/design-system.css, so this page follows the theme toggle like the rest
 * of the app instead of being permanently dark.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1] } },
};

const revealOnScroll = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] },
};

const CAPABILITIES = [
  {
    icon: Database,
    title: "Self-derived hazard scoring",
    desc: "Flood and landslide exposure computed from real DEM elevation and hydrography data. Every contributing signal and its weight is recorded alongside the score — nothing is assumed if it can't be measured.",
  },
  {
    icon: Cpu,
    title: "CP-SAT optimisation",
    desc: "Google OR-Tools' CP-SAT constraint solver — not a heuristic — re-routes populations away from compromised infrastructure in milliseconds, proving optimality or reporting its gap when it can't.",
  },
  {
    icon: Route,
    title: "Real OSM road routing",
    desc: "Shortest paths follow the actual OpenStreetMap road graph for Barpeta district. Routes carry real geometry and road-network distances, with a distinct alternative road per redundant route.",
  },
  {
    icon: Brain,
    title: "ML susceptibility blending",
    desc: "A trained landslide susceptibility model blends a learned shift into derived exposure scores. The flood model is reported inactive rather than papered over — every contribution is traceable.",
  },
  {
    icon: Users,
    title: "Human-in-the-loop",
    desc: "Algorithms propose, officers dispose. No plan reaches the field without district officer approval, and every version — approved or rejected — is retained in an append-only audit log.",
  },
  {
    icon: Activity,
    title: "Live plan health monitoring",
    desc: "Continuous diagnosis of unmet demand, capacity shortfalls and route blockages, with concrete interventions that can be applied and immediately re-solved.",
  },
];

const SOLVER_STEPS = [
  { step: "01", title: "Ingest & derive", desc: "Population, DEM-derived hazard scores, OSM road routes and shelter availability are loaded. ML susceptibility models blend in where they have real predictions." },
  { step: "02", title: "Build the model", desc: "Decision variables encode who goes where, constrained by shelter capacity, fleet size, medical cover, food supply and flood-road accessibility fractions." },
  { step: "03", title: "Solve and optimise", desc: "CP-SAT minimises weighted travel time and risk under every hard constraint, reporting solver status, solve time and its own optimality gap — all real solver output." },
  { step: "04", title: "Human approval", desc: "The plan surfaces as pending. A district officer verifies it before any operational change goes live. No approval, no deployment." },
];

const LIVE_FACTS = [
  { value: "CP-SAT", label: "Exact solver, not a heuristic" },
  { value: "OSM", label: "Real road network geometry" },
  { value: "DEM", label: "Elevation-derived hazard scores" },
  { value: "ML", label: "Trained susceptibility model" },
];

function CapabilityCard({ icon: Icon, title, desc, index }) {
  const cardRef = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 8);
    rotateX.set(py * -8);
  };
  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div {...revealOnScroll} transition={{ ...revealOnScroll.transition, delay: index * 0.07 }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 800 }}
      >
        <motion.div
          style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: "preserve-3d" }}
          className="as-glass"
        >
          <div style={{ padding: "1.75rem", height: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <span className="as-icon-tile">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <h3 className="as-heading">{title}</h3>
            <p className="as-body">{desc}</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        overflowX: "hidden",
      }}
    >
      <div className="as-ambient" aria-hidden="true" />

      {/* ---------------------------------------------------------------- Hero */}
      <AuroraBackground className="!h-screen !overflow-hidden" style={{ background: "var(--bg)" }}>
        {/* 3D node-graph: a visual echo of the assignment problem the
            product actually solves — habitations, sites, the routes between
            them — sitting quietly behind the headline. */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
          <NetworkMesh3D />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "var(--as-max-width)",
            margin: "4rem auto 0",
            padding: "0 var(--as-gutter)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.75rem",
          }}
        >
          <motion.div variants={itemVariants}>
            <AnimatedGradientText className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm">
              Aapda Setu &middot; SIH 2026 Prototype
              <ChevronRight className="inline ml-1 size-4" />
            </AnimatedGradientText>
          </motion.div>

          <motion.h1 variants={itemVariants} className="as-display">
            Real-time operations for
            <br />
            <span className="as-gradient-text">disaster relocation.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="as-body" style={{ maxWidth: "42rem", fontSize: "1.0625rem" }}>
            Hazard-based red-zone identification, real OSM road routing, CP-SAT constraint optimisation
            and immediate relocation planning for vulnerable habitations &mdash; solved under hard
            constraints, approved by a human, and auditable end to end.
          </motion.p>

          {/* Live capability pills */}
          <motion.div
            variants={itemVariants}
            style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", justifyContent: "center" }}
          >
            {LIVE_FACTS.map((f) => (
              <span key={f.value} className="as-chip as-chip-live" style={{ fontSize: "0.75rem" }}>
                <span className="as-dot as-dot-live" />
                <strong style={{ marginRight: 2 }}>{f.value}</strong> {f.label}
              </span>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} style={{ marginTop: "0.5rem" }}>
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <ShimmerButton background="var(--cta-bg)" shimmerColor="#ffffff" shimmerSize="0.1em">
                  <span className="flex items-center gap-2 text-sm font-medium tracking-tight text-white lg:text-base">
                    Enter dashboard <ChevronRight size={18} />
                  </span>
                </ShimmerButton>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </AuroraBackground>

      {/* ------------------------------------------------------- The core problem */}
      <section className="as-section">
        <motion.div {...revealOnScroll} className="as-section-head">
          <p className="as-eyebrow" style={{ marginBottom: "0.75rem" }}>The core problem</p>
          <h2 className="as-title">Static plans fail the moment the ground changes</h2>
          <p className="as-body">
            A binder written in March cannot know which bridge went under in July. Aapda Setu
            replaces the binder with an assignment engine that re-solves the moment a route closes,
            a shelter loses capacity, or a field officer reports what they can actually see.
            Every module below is live — values come from the running backend, not a screenshot.
          </p>
        </motion.div>

        <div className="as-grid">
          {CAPABILITIES.map((capability, index) => (
            <CapabilityCard key={capability.title} {...capability} index={index} />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------- Live module status grid */}
      <ModuleOverview />

      {/* --------------------------------------------------- How the solver works */}
      <section className="as-section">
        <motion.div {...revealOnScroll} className="as-section-head">
          <p className="as-eyebrow" style={{ marginBottom: "0.75rem" }}>Under the hood</p>
          <h2 className="as-title">How the solver works</h2>
          <p className="as-body">
            CP-SAT from Google OR-Tools solves the assignment problem exactly, finding the optimal
            plan under real hard constraints rather than a nearest-shelter approximation. Solve time,
            solver status and optimality gap are all real output &mdash; when the problem is genuinely
            infeasible it falls back to a greedy heuristic and says so.
          </p>
        </motion.div>

        <div className="as-grid">
          {SOLVER_STEPS.map((item, index) => (
            <motion.div
              key={item.step}
              {...revealOnScroll}
              transition={{ ...revealOnScroll.transition, delay: index * 0.07 }}
            >
              <div className="as-glass as-glass-quiet" style={{ padding: "1.5rem", height: "100%" }}>
                <div className="as-eyebrow as-numeric" style={{ marginBottom: "0.75rem" }}>Step {item.step}</div>
                <h3 className="as-heading" style={{ fontSize: "1.0625rem", marginBottom: "0.5rem" }}>{item.title}</h3>
                <p className="as-small">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------- What's real vs estimated */}
      <section className="as-section" style={{ paddingTop: 0 }}>
        <motion.div {...revealOnScroll} className="as-section-head">
          <p className="as-eyebrow" style={{ marginBottom: "0.75rem" }}>Transparency</p>
          <h2 className="as-title">What's real, and what's estimated</h2>
          <p className="as-body">
            A system built to inform decisions about people's safety should never blur this line.
          </p>
        </motion.div>

        <div className="as-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {[
            {
              kind: "real",
              label: "Real solver output",
              title: "CP-SAT assignments",
              body: "Every assignment is what CP-SAT actually solved for, against real capacity, supply, and route constraints. Objective value, solver status and optimality gap are all genuine solver output.",
            },
            {
              kind: "real",
              label: "Real road geometry",
              title: "OSM road-network routes",
              body: "Routes follow the actual OpenStreetMap road graph. Each route carries a distinct geometry, real distance, and a separate alternative road for redundancy.",
            },
            {
              kind: "real",
              label: "Real ML contribution",
              title: "Landslide susceptibility model",
              body: "A trained model shifts derived hazard scores for habitations where it has predictions. The flood model is reported inactive — it's not silently applied at zero.",
            },
            {
              kind: "estimated",
              label: "Estimated / demonstration",
              title: "Habitation coordinates",
              body: "Demonstration dataset coordinates are estimated placements for Barpeta district, not a surveyed register of real households.",
            },
            {
              kind: "estimated",
              label: "Estimated / demonstration",
              title: "Population & vulnerability figures",
              body: "Counts and vulnerability scores in this dataset are illustrative, standing in for census and field-survey data a real deployment would use.",
            },
          ].map((item, i) => {
            const isReal = item.kind === "real";
            const tint = isReal ? "#34d399" : "#fbbf24";
            return (
              <motion.div
                key={item.title}
                {...revealOnScroll}
                transition={{ ...revealOnScroll.transition, delay: i * 0.05 }}
                className="as-glass"
                style={{ padding: "1.4rem", borderRadius: 16 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <ShieldCheck size={15} style={{ color: tint }} />
                  <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": tint }}>
                    {item.label}
                  </span>
                </div>
                <h3 className="as-heading" style={{ marginBottom: 6 }}>{item.title}</h3>
                <p className="as-body" style={{ margin: 0 }}>{item.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------- Provenance note */}
      <div
        style={{
          borderTop: "1px solid var(--as-hairline)",
          borderBottom: "1px solid var(--as-hairline)",
          background: "var(--as-surface-0)",
          backdropFilter: "blur(20px)",
          padding: "3rem var(--as-gutter)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div {...revealOnScroll} style={{ maxWidth: "48rem", margin: "0 auto", textAlign: "center" }}>
          <p className="as-eyebrow" style={{ marginBottom: "0.75rem" }}>What these numbers are</p>
          <p className="as-body">
            Hazard scores reflect <strong style={{ color: "var(--text-light)" }}>relative physical
            exposure patterns</strong>, not certified flood probabilities. They are not hydraulic model
            output, not return periods, and not a substitute for official CWC or ASDMA hazard
            zonation. Every score carries the signals it was built from, and any signal that could
            not be measured is reported as unavailable rather than assumed.
          </p>
        </motion.div>
      </div>

      <footer style={{ padding: "3rem var(--as-gutter)", textAlign: "center", position: "relative", zIndex: 10 }}>
        <p className="as-small" style={{ fontSize: "0.8125rem" }}>
          Aapda Setu &middot; Barpeta district, Assam &middot; built for SIH 2026
        </p>
      </footer>
    </motion.div>
  );
}
