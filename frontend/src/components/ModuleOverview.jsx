import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Brain,
  Bus,
  Cpu,
  FlaskConical,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  ScrollText,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";
import { API_BASE_URL } from "@/config";

/*
 * System modules overview.
 *
 * Every status value on these cards comes from GET /system/modules and is
 * computed by the backend from live state at request time. Nothing here is
 * hardcoded. When the backend reports status_value as null - because a module
 * genuinely has nothing to report yet - the card renders an em dash and the
 * reason, never a zero or a placeholder that could be mistaken for a reading.
 */

// Maps the backend's icon key to a component. The backend owns the module
// list; the frontend only decides how each one is drawn.
const ICONS = {
  cpu: Cpu,
  waves: Waves,
  route: RouteIcon,
  activity: Activity,
  "shield-check": ShieldCheck,
  "flask-conical": FlaskConical,
  "scroll-text": ScrollText,
  radio: Radio,
  bus: Bus,
  target: Target,
  brain: Brain,
};

const REFRESH_INTERVAL_MS = 15000;

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: Math.min(index, 8) * 0.045, ease: [0.22, 0.61, 0.36, 1] },
  }),
};

function ModuleCard({ module, index, loading }) {
  const Icon = ICONS[module.icon] || Cpu;

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      <Link to={module.route} className="as-glass as-interactive" style={{ padding: "1.5rem", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "1rem" }}>
          <span className="as-icon-tile">
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 className="as-heading" style={{ fontSize: "1rem" }}>{module.name}</h3>
            <p className="as-small" style={{ marginTop: "0.375rem" }}>{module.description}</p>
          </div>
        </div>

        <hr className="as-divider" />

        <div style={{ marginTop: "1rem", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ minWidth: 0 }}>
            {loading ? (
              <span className="as-skeleton" style={{ display: "inline-block", width: "5.5rem", height: "1.35rem" }} />
            ) : module.available ? (
              <span className="as-numeric" style={{ fontSize: "1.15rem", fontWeight: 650, color: "var(--text-light)" }}>
                {module.status_value}
              </span>
            ) : (
              /* Not a zero, not "N/A" - the backend had no reading to give. */
              <span className="as-numeric as-unavailable" style={{ fontSize: "1.15rem", fontWeight: 650 }} title="No live value available">
                &mdash;
              </span>
            )}
            <div className="as-small" style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>
              {loading ? "\u00a0" : module.status_label}
            </div>
          </div>

          {!loading && module.available && (
            <span className="as-chip as-chip-live" style={{ flex: "none" }}>
              <span className="as-dot as-dot-live" />
              Live
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function ModuleOverview() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchModules = useCallback(async (signal) => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/modules`, { signal });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const body = await response.json();
      setModules(body.modules || []);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Could not reach the backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchModules(controller.signal);

    // Poll so the grid reflects events triggered elsewhere in the app.
    const timer = setInterval(() => fetchModules(controller.signal), REFRESH_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fetchModules]);

  // Skeleton placeholders keep the grid from collapsing on first paint.
  const rendered = loading && modules.length === 0
    ? Array.from({ length: 6 }, (_, i) => ({
        id: `skeleton-${i}`,
        name: "Loading module",
        description: "\u00a0",
        icon: "cpu",
        route: "/",
        status_value: null,
        status_label: "",
        available: false,
      }))
    : modules;

  return (
    <section className="as-section" id="modules">
      <div className="as-section-head">
        <p className="as-eyebrow" style={{ marginBottom: "0.75rem" }}>System modules</p>
        <h2 className="as-title">Every capability, reporting its own state</h2>
        <p className="as-body">
          These are not screenshots. Each value below is read from the running backend, and a module
          with nothing real to report shows an em dash rather than a placeholder.
        </p>
      </div>

      {error && (
        <div
          className="as-glass"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            borderColor: "rgba(244, 63, 94, 0.35)",
          }}
        >
          <AlertCircle size={18} color="var(--as-critical)" style={{ flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="as-small" style={{ color: "var(--text-light)", fontWeight: 600 }}>
              Live status unavailable
            </div>
            <div className="as-small">{error}. Start the backend with <code>uvicorn main:app</code>.</div>
          </div>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchModules(); }}
            className="as-chip"
            style={{ cursor: "pointer", flex: "none" }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <div className="as-grid">
        {rendered.map((module, index) => (
          <ModuleCard key={module.id} module={module} index={index} loading={loading && modules.length === 0} />
        ))}
      </div>

      {updatedAt && (
        <p className="as-small" style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.75rem" }}>
          Last read {updatedAt.toLocaleTimeString()} &middot; refreshes every {REFRESH_INTERVAL_MS / 1000}s
        </p>
      )}
    </section>
  );
}
