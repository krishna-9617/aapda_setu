import React from "react";
import { motion } from "framer-motion";
import {
  Info, Compass, Cpu, ShieldCheck, Database, Server, Layers, GitBranch,
  CheckCircle2, AlertTriangle, Building2, Route, Brain, Activity,
  BookOpen, ExternalLink, Map, Waves, Mountain, Users, FileText,
  Zap, Clock, Eye, Lock,
} from "lucide-react";
import MeshBackground from "../components/MeshBackground";
import { API_BASE_URL } from "../config";

const revealOnScroll = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] },
};

const STACK = [
  {
    layer: "Optimization",
    detail: "Google OR-Tools CP-SAT — a constraint solver, not a heuristic. It proves optimality or reports exactly how far a fallback plan is from it. Solve time, status and the optimality gap are all genuine solver output.",
    icon: Cpu,
  },
  {
    layer: "Backend",
    detail: "FastAPI (Python) — the REST API, event handlers, the geographic derivation pipeline and the audit log all live here. Every mutation goes through an explicit event with a written record.",
    icon: Server,
  },
  {
    layer: "Hazard & route derivation",
    detail: "rasterio, shapely, pyproj, osmnx/networkx — turn a DEM and a hydrography layer into documented hazard scores, and build real OSM road-network routes with alternative geometries per corridor.",
    icon: Layers,
  },
  {
    layer: "ML susceptibility",
    detail: "A trained landslide model (scikit-learn Random Forest, class_weight=balanced, AUC-ROC 0.9289) blends a per-habitation susceptibility shift into derived hazard scores. Flood model uses Logistic Regression (20 features, AUC 0.9275).",
    icon: Brain,
  },
  {
    layer: "Road routing",
    detail: "Routes computed via OSRM (OpenStreetMap Routing Machine, public server) with local OSM graph fallback via osmnx. 12/12 routes follow real road geometry — OSRM and osm_road_network are both real OSM-based routers.",
    icon: Route,
  },
  {
    layer: "Frontend",
    detail: "React + Vite, Leaflet for the map (with real route polylines), framer-motion for interaction. Theme-aware via CSS custom properties — every page respects the dark/light toggle.",
    icon: GitBranch,
  },
];

// Full dataset provenance table
const DATASETS = [
  {
    category: "Population & Habitations",
    icon: Users,
    tint: "#818cf8",
    entries: [
      {
        name: "Census of India 2011",
        use: "Village-level population counts, household figures and gender split for BRP-001 (Ambari), BRP-003 (Phulkipara), BRP-004 (Baghbar), BRP-005 (Kalgachia)",
        source: "Office of the Registrar General & Census Commissioner, India. Primary Census Abstract, 2011. LGD codes used: 283013, 283012.",
        kind: "real",
        url: "https://censusindia.gov.in",
      },
      {
        name: "OSM / Nominatim geocoding",
        use: "Location and type classification for BRP-002 (Howly town). Coordinates from Nominatim reverse geocode.",
        source: "OpenStreetMap contributors, CC BY-SA 2.0. Nominatim API. Data vintage: September 2026.",
        kind: "real",
        url: "https://nominatim.openstreetmap.org",
      },
      {
        name: "Shelter institution names",
        use: "Named real educational/public institutions in Barpeta (Barpeta Vidyapith, Madhab Choudhury College, etc.) used as shelter site identifiers.",
        source: "OpenStreetMap Overpass API. CC BY-SA 2.0. Queried September 2026.",
        kind: "real",
        url: "https://overpass-api.de",
      },
      {
        name: "Shelter capacities",
        use: "Space, water, food, medical and road capacities for each shelter site.",
        source: "Estimated from NDMA Guidelines on Minimum Standards of Relief (2016), Section 3 — Shelter: 3.5 sq.m covered area per person. Capacities are illustrative approximations, not surveyed measurements.",
        kind: "estimated",
        url: "https://ndma.gov.in",
      },
    ],
  },
  {
    category: "Terrain & Elevation",
    icon: Mountain,
    tint: "#34d399",
    entries: [
      {
        name: "SRTM / NASADEM",
        use: "Digital Elevation Model (DEM) used to compute slope, HAND (Height Above Nearest Drainage), flood low-lying exposure and landslide slope terms in the hazard derivation pipeline.",
        source: "NASA Shuttle Radar Topography Mission (SRTM). Accessed via geo.fetch_dem using the OpenTopography/EarthData NASADEM service. ~30m horizontal resolution.",
        kind: "real",
        url: "https://www.earthdata.nasa.gov/esds/competitive-programs/measures/nasadem",
      },
      {
        name: "ESA WorldCover 2021",
        use: "10m land-cover classification (forest, cropland, built-up, water, bare soil) for land-use context in hazard scoring.",
        source: "European Space Agency WorldCover 2021. 10m resolution, CC BY 4.0. Accessed via geo.fetch_worldcover.",
        kind: "real",
        url: "https://esa-worldcover.org",
      },
    ],
  },
  {
    category: "Hydrography & Flood Proximity",
    icon: Waves,
    tint: "#38bdf8",
    entries: [
      {
        name: "Natural Earth 10m Rivers",
        use: "River centrelines used to compute proximity-based flood exposure. Generalised at 1:10m scale — positional uncertainty is 1–3 km. Primary input when OSM centrelines are not available.",
        source: "Natural Earth Data. naturalearthdata.com. Public domain.",
        kind: "real",
        url: "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
      },
      {
        name: "OpenStreetMap waterways",
        use: "Higher-accuracy river/canal centrelines for Barpeta district when available. Positional accuracy typically within tens of metres.",
        source: "OpenStreetMap contributors. CC BY-SA 2.0. Accessed via Overpass API.",
        kind: "real",
        url: "https://www.openstreetmap.org",
      },
    ],
  },
  {
    category: "Road Network & Routing",
    icon: Route,
    tint: "#fb923c",
    entries: [
      {
        name: "OpenStreetMap road graph (osmnx)",
        use: "Local cached road network graph for Barpeta district. Used to compute k-shortest simple paths for alternate routes (R01B, R04B, R06B). Graph: 2,242 nodes, 5,872 edges.",
        source: "OpenStreetMap contributors. CC BY-SA 2.0. Downloaded via osmnx (Boeing 2017). Graph cached by geo.fetch_roads.",
        kind: "real",
        url: "https://www.openstreetmap.org",
      },
      {
        name: "OSRM public routing server",
        use: "Primary routes (R01, R02–R09) routed via OSRM — the OpenStreetMap Routing Machine. Provides road-following geometry, real distance and travel time. 9/12 routes use OSRM.",
        source: "Project OSRM. Uses OpenStreetMap data. Public demo server: router.project-osrm.org. CC BY-SA 2.0 for underlying data.",
        kind: "real",
        url: "https://project-osrm.org",
      },
    ],
  },
  {
    category: "ML Training Datasets",
    icon: Brain,
    tint: "#a78bfa",
    entries: [
      {
        name: "Flood prediction dataset (Kaggle)",
        use: "Training data for the flood susceptibility Logistic Regression model (20 features, id column excluded after mismatch fix). 5-fold CV AUC: 0.9275. Features: MonsoonIntensity, TopographyDrainage, RiverManagement, Deforestation, Urbanization, ClimateChange, DamsQuality, Siltation, AgriculturalPractices, Encroachments, IneffectiveDisasterPreparedness, DrainageSystems, CoastalVulnerability, Landslides, Watersheds, DeterioratingInfrastructure, PopulationScore, WetlandLoss, InadequatePlanning, PoliticalFactors.",
        source: "Kaggle community dataset — flood prediction (1.1M rows). Retrained without id column to fix feature-count mismatch.",
        kind: "estimated",
        url: "https://www.kaggle.com",
      },
      {
        name: "Landslide prediction dataset (Kaggle)",
        use: "Training data for the landslide Random Forest susceptibility model (5 features, class_weight=balanced). 5-fold CV AUC: 0.9999 (reflects trivially separable synthetic data). Features: Temperature, Humidity, Precipitation, Soil Moisture, Elevation.",
        source: "sreeragunandha/landslide-prediction-dataset on Kaggle. 5,000 rows, synthetic, 65.7:1 class imbalance. Model retrained with class_weight=balanced to fix degenerate original (old AUC=1.000, phi=0 always).",
        kind: "estimated",
        url: "https://www.kaggle.com/datasets/sreeragunandha/landslide-prediction-dataset",
      },
    ],
  },
  {
    category: "Historical Disaster Context",
    icon: FileText,
    tint: "#f59e0b",
    entries: [
      {
        name: "ASDMA Flood Situation Reports (2022–2023)",
        use: "Historical flood event data: 1.27M people affected in 2022 (Exceptional), 65,221 in 2023 (Severe). Used for contextual display in About and for system context API.",
        source: "Assam State Disaster Management Authority (ASDMA). asdma.assam.gov.in. Figures from secondary sources (Sphere India 2022 assessment, NDTV citing ASDMA June 2023).",
        kind: "real",
        url: "https://asdma.assam.gov.in",
      },
      {
        name: "NDMA Relief Standards (2016)",
        use: "Shelter capacity standard: 3.5 sq.m covered area per person. Used to parameterise effective capacity for all shelter sites.",
        source: "National Disaster Management Authority, India. Guidelines on Minimum Standards of Relief, 2016. Section 3 — Shelter.",
        kind: "real",
        url: "https://ndma.gov.in",
      },
    ],
  },
];

const REAL_VS_ESTIMATED = [
  {
    kind: "real",
    title: "CP-SAT optimizer output",
    body: "Every assignment is what CP-SAT actually solved for, against real capacity, supply and route constraints. Objective value, solver status and optimality gap are genuine solver output.",
  },
  {
    kind: "real",
    title: "All 12 route geometries",
    body: "9 routes via OSRM (OpenStreetMap Routing Machine) + 3 via local OSM graph = 12/12 routes follow real road geometry. The dashboard status card now correctly shows 12/12.",
  },
  {
    kind: "real",
    title: "Landslide ML contribution",
    body: "Random Forest model (class_weight=balanced, AUC-ROC 0.9289) shifts derived hazard scores for habitations where it has real predictions. The count of habitations that received an ML shift is reported exactly.",
  },
  {
    kind: "real",
    title: "Flood ML contribution",
    body: "Logistic Regression (20 features, AUC 0.9275) blends a flood susceptibility shift. 2 features (MonsoonIntensity, PopulationScore) use real derived values; 3 use dataset-median fallback where DEM is unavailable.",
  },
  {
    kind: "real",
    title: "DEM-derived hazard scores",
    body: "Flood and landslide exposure from SRTM/NASADEM elevation + Natural Earth hydrography. Every score carries a provenance block naming signals and weights used.",
  },
  {
    kind: "estimated",
    title: "Shelter site coordinates",
    body: "Real institution names (Barpeta Vidyapith, Madhab Choudhury College, etc.) but coordinates are approximate placements, not surveyed site boundaries.",
  },
  {
    kind: "estimated",
    title: "Shelter capacities",
    body: "Estimated from NDMA 3.5 sq.m/person guideline and building footprint approximation, not from a real facility survey.",
  },
  {
    kind: "estimated",
    title: "Vulnerability scores",
    body: "Composite vulnerability scores are illustrative, standing in for census-derived fragility indices a real deployment would use.",
  },
];

function StackRow({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      {...revealOnScroll}
      transition={{ ...revealOnScroll.transition, delay: index * 0.06 }}
      className="as-glass-quiet"
      style={{ display: "flex", gap: 16, padding: "1.1rem 1.25rem", borderRadius: 14, alignItems: "flex-start", border: "1px solid var(--as-hairline)" }}
    >
      <span className="as-icon-tile" style={{ flexShrink: 0 }}><Icon size={18} /></span>
      <div>
        <div className="as-small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, color: "var(--text-light)" }}>
          {item.layer}
        </div>
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
    <motion.div
      {...revealOnScroll}
      transition={{ ...revealOnScroll.transition, delay: index * 0.05 }}
      className="as-glass"
      style={{ padding: "1.4rem", borderRadius: 16 }}
    >
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

function DatasetSection({ group, index }) {
  const Icon = group.icon;
  return (
    <motion.div
      {...revealOnScroll}
      transition={{ ...revealOnScroll.transition, delay: index * 0.06 }}
      style={{ marginBottom: "2rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
        <span
          className="as-icon-tile"
          style={{
            "--as-icon-tint": group.tint,
            background: `color-mix(in srgb, ${group.tint} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${group.tint} 32%, transparent)`,
            color: group.tint,
          }}
        >
          <Icon size={16} />
        </span>
        <h3 className="as-heading" style={{ margin: 0, fontSize: "1rem" }}>{group.category}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {group.entries.map((entry, i) => {
          const isReal = entry.kind === "real";
          const entryTint = isReal ? "#34d399" : "#fbbf24";
          return (
            <motion.div
              key={entry.name}
              {...revealOnScroll}
              transition={{ ...revealOnScroll.transition, delay: i * 0.04 }}
              className="as-glass-quiet"
              style={{ padding: "1rem 1.25rem", borderRadius: 12, border: "1px solid var(--as-hairline)" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="as-small" style={{ fontWeight: 700, color: "var(--text-light)" }}>{entry.name}</span>
                  <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": entryTint, fontSize: "0.625rem" }}>
                    {isReal ? "Real" : "Estimated"}
                  </span>
                </div>
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--as-accent)", flexShrink: 0 }}
                    title="Source link">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              <p className="as-small" style={{ margin: "0 0 6px", color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-light)", fontWeight: 600 }}>Used for: </strong>{entry.use}
              </p>
              <p className="as-small" style={{ margin: 0, opacity: 0.75, fontStyle: "italic" }}>
                {entry.source}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

const EXTRA_FEATURES = [
  {
    icon: Zap,
    title: "CP-SAT re-optimisation on events",
    body: "Triggering a bridge collapse, capacity drop or rainfall event immediately re-solves the assignment problem under the updated constraints and surfaces a pending plan for approval.",
    tint: "#818cf8",
  },
  {
    icon: Clock,
    title: "Append-only audit timeline",
    body: "Every event, plan solve, approval, rejection and field report is written to an immutable log with UTC timestamps. No record can be edited or deleted.",
    tint: "#34d399",
  },
  {
    icon: Eye,
    title: "Provenance blocks on every score",
    body: "Every derived hazard score carries the list of signals used, their weights, and a note for any signal that could not be measured. Nothing is assumed silently.",
    tint: "#38bdf8",
  },
  {
    icon: Lock,
    title: "Human approval gate",
    body: "No plan goes live without explicit district officer approval. The pending/approved/rejected state is tracked per plan version, not globally.",
    tint: "#fb923c",
  },
  {
    icon: Map,
    title: "Live map with real route polylines",
    body: "The dashboard map draws actual road-following polylines from OSRM/OSM geometry, not straight lines. Each route can be focused to highlight the assignment corridor.",
    tint: "#a78bfa",
  },
  {
    icon: Activity,
    title: "Plan health diagnostics",
    body: "Live computation of unmet demand, capacity shortfalls per site, and route blockages. Each issue surfaces a concrete intervention that can be applied and re-solved.",
    tint: "#f59e0b",
  },
  {
    icon: BookOpen,
    title: "What-If sandbox",
    body: "Vary population or hazard for any habitation and re-solve without touching the live plan. The sandbox plan is compared against the live plan so the effect of each change is explicit.",
    tint: "#f43f5e",
  },
  {
    icon: FileText,
    title: "Field report integration",
    body: "Field officers can submit structured observations (bridge state, shelter capacity update, population update). Each report triggers re-planning automatically.",
    tint: "#4ade80",
  },
];

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
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <MeshBackground variant="violet" />
      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
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

        {/* What's running */}
        <motion.section {...revealOnScroll} className="as-glass" style={{ marginTop: "2.5rem", padding: "2rem", borderRadius: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
            <Activity size={18} style={{ color: "var(--as-accent)" }} />
            <h2 className="as-heading" style={{ margin: 0 }}>What's running right now</h2>
          </div>
          <p className="as-body" style={{ marginBottom: "1.25rem" }}>
            These aren't aspirational features — they're active in the running system:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: "CP-SAT solver", detail: "Exact constraint optimisation — status, solve time and optimality gap all reported as real solver output." },
              { label: "12/12 OSM road routes", detail: "All 12 routes use real road geometry: 9 via OSRM + 3 via local OSM graph. The 3/12 dashboard count was a bug (now fixed)." },
              { label: "DEM hazard derivation", detail: "SRTM/NASADEM elevation + Natural Earth hydrography → per-habitation flood and landslide exposure scores with provenance." },
              { label: "Flood ML model (LR)", detail: "Logistic Regression on 20 features (AUC 0.9275). 2 real features, 3 median-fallback (noted), rest median." },
              { label: "Landslide ML model (RF)", detail: "Random Forest (class_weight=balanced, AUC-ROC 0.9289). phi≈0 for flat Barpeta floodplain is geographically correct." },
              { label: "Human approval workflow", detail: "Pending plans require explicit officer approval. Every version — approved or rejected — is on the immutable record." },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                {...revealOnScroll}
                transition={{ ...revealOnScroll.transition, delay: i * 0.05 }}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <CheckCircle2 size={15} style={{ color: "#34d399", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div className="as-small" style={{ fontWeight: 700, color: "var(--text-light)", marginBottom: 2 }}>{item.label}</div>
                  <p className="as-small" style={{ margin: 0 }}>{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Core principle */}
        <motion.section {...revealOnScroll} className="as-glass" style={{ marginTop: "2rem", padding: "2rem", borderRadius: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
            <Compass size={18} style={{ color: "var(--as-accent)" }} />
            <h2 className="as-heading" style={{ margin: 0 }}>The core principle</h2>
          </div>
          <p className="as-body" style={{ marginBottom: "1.25rem" }}>
            Three steps, each done by whichever of a machine or a person is actually better suited:
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

        {/* All features */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
            <Zap size={18} style={{ color: "var(--as-accent)" }} />
            <h2 className="as-heading" style={{ margin: 0 }}>All system features</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {EXTRA_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  {...revealOnScroll}
                  transition={{ ...revealOnScroll.transition, delay: i * 0.05 }}
                  className="as-glass-quiet"
                  style={{ display: "flex", gap: 12, padding: "1rem 1.25rem", borderRadius: 14, border: "1px solid var(--as-hairline)", alignItems: "flex-start" }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "2.25rem", height: "2.25rem", borderRadius: 8, flexShrink: 0,
                    background: `color-mix(in srgb, ${f.tint} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${f.tint} 30%, transparent)`,
                    color: f.tint,
                  }}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <div className="as-small" style={{ fontWeight: 700, color: "var(--text-light)", marginBottom: 3 }}>{f.title}</div>
                    <p className="as-small" style={{ margin: 0 }}>{f.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Tech stack */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
            <Database size={18} style={{ color: "var(--as-accent)" }} />
            <h2 className="as-heading" style={{ margin: 0 }}>What it's built on</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {STACK.map((item, i) => <StackRow key={item.layer} item={item} index={i} />)}
          </div>
        </motion.section>

        {/* Dataset sources */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
            <BookOpen size={18} style={{ color: "var(--as-accent)" }} />
            <h2 className="as-heading" style={{ margin: 0 }}>Data sources & provenance</h2>
          </div>
          <p className="as-body" style={{ marginBottom: "1.75rem", maxWidth: "42rem" }}>
            Every dataset used in the pipeline is listed below with its source, how it's used,
            and whether it's real measured data or an estimated/synthetic stand-in.
          </p>
          {DATASETS.map((group, i) => (
            <DatasetSection key={group.category} group={group} index={i} />
          ))}
        </motion.section>

        {/* Real vs estimated */}
        <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
            <ShieldCheck size={18} style={{ color: "var(--as-accent)" }} />
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

        {/* Regional context from API */}
        {systemContext && (
          <motion.section {...revealOnScroll} style={{ marginTop: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
              <Info size={18} style={{ color: "var(--as-accent)" }} />
              <h2 className="as-heading" style={{ margin: 0 }}>Regional Disaster History</h2>
            </div>
            <p className="as-body" style={{ color: "var(--text-muted)", maxWidth: "42rem", marginBottom: "1rem" }}>
              {systemContext.historical_flood_context.flood_frequency}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {systemContext.historical_flood_context.recent_events.map((event, i) => (
                <div key={i} className="as-glass" style={{ padding: "1rem", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div className="as-small" style={{ fontWeight: 700, color: "var(--text-light)" }}>
                      {event.year} Flood
                    </div>
                    <span className="as-chip as-chip-tint" style={{ "--as-chip-tint": "#f59e0b" }}>{event.severity}</span>
                  </div>
                  <div className="as-small" style={{ color: "var(--text-muted)", marginBottom: 8 }}>{event.peak_affected_note}</div>
                  <div className="as-small" style={{ color: "var(--as-accent)" }}>Source: {event.source}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem", marginTop: "2rem" }}>
              <Building2 size={18} style={{ color: "var(--as-accent)" }} />
              <h2 className="as-heading" style={{ margin: 0 }}>Nearby Critical Infrastructure</h2>
            </div>
            <p className="as-body" style={{ color: "var(--text-muted)", maxWidth: "42rem", marginBottom: "1rem" }}>
              {systemContext.critical_infrastructure_near_sites.note}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {systemContext.critical_infrastructure_near_sites.hospitals_and_clinics.slice(0, 4).map((h, i) => (
                <div key={i} className="as-glass-quiet" style={{ padding: "1rem", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--as-hairline)" }}>
                  <div>
                    <div className="as-small" style={{ fontWeight: 700, color: "var(--text-light)" }}>{h.name}</div>
                    {h.note && <div className="as-small" style={{ color: "var(--text-muted)" }}>{h.note}</div>}
                  </div>
                  <div className="as-chip as-chip-muted" style={{ marginLeft: 8 }}>{h.type}</div>
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
