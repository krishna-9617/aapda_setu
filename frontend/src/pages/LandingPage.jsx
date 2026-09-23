import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ChevronRight, Cpu, Database, Users } from "lucide-react";
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
    desc: "Flood and landslide exposure computed from elevation and hydrography, with every contributing signal and its weight recorded alongside the score.",
  },
  {
    icon: Cpu,
    title: "CP-SAT re-optimisation",
    desc: "OR-Tools re-routes populations away from compromised infrastructure in milliseconds while strictly respecting shelter, supply and medical capacity.",
  },
  {
    icon: Users,
    title: "Human-in-the-loop",
    desc: "Algorithms propose, officers dispose. No plan reaches the field without approval, and every version is retained in an append-only log.",
  },
];

const SOLVER_STEPS = [
  { step: "01", title: "Ingest live data", desc: "Population, derived hazard scores, road capacity and shelter availability are loaded and pre-processed." },
  { step: "02", title: "Build the model", desc: "Decision variables encode who goes where, constrained by capacity, fleet, medical cover and food supply." },
  { step: "03", title: "Solve and optimise", desc: "CP-SAT minimises weighted travel time and risk under every hard constraint, reporting its own optimality gap." },
  { step: "04", title: "Human approval", desc: "The re-plan surfaces as pending. A district officer verifies it before any operational change goes live." },
];

function CapabilityCard({ icon: Icon, title, desc, index }) {
  // Subtle 3D-tilt-on-hover: the card leans toward the cursor within a small
  // range, a lighter second touch of real depth alongside the hero mesh
  // above. Resets smoothly on mouse leave rather than snapping back.
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
    <motion.div {...revealOnScroll} transition={{ ...revealOnScroll.transition, delay: index * 0.08 }}>
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
        {/* 3D node-graph: real CSS perspective/translateZ depth, tilting
            toward the cursor - a visual echo of the assignment problem the
            product actually solves (habitations, sites, the routes between
            them), sitting quietly behind the headline rather than competing
            with it. Faded further via opacity so it reads as ambient depth,
            not the main event. */}
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

          <motion.p variants={itemVariants} className="as-body" style={{ maxWidth: "38rem", fontSize: "1.0625rem" }}>
            Hazard-based red-zone identification, carrying-capacity assessment and immediate
            relocation planning for vulnerable habitations &mdash; solved under hard constraints,
            approved by a human, and auditable end to end.
          </motion.p>

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
            plan under real hard constraints rather than a nearest-shelter approximation. When the
            problem is genuinely infeasible it falls back to a greedy heuristic and says so.
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
            Hazard scores here reflect <strong style={{ color: "var(--text-light)" }}>relative physical
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
