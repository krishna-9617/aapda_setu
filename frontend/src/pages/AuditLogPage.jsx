import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../config";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import MeshBackground from "../components/MeshBackground";
import {
  Download, FileText, Rocket, Zap, ShieldCheck, ShieldX,
  ArrowUpRight, ArrowDownRight, Minus, Clock,
} from "lucide-react";

// Every action_type the backend actually records (backend/main.py
// record_audit_log calls). Anything else falls back to Zap/slate so a future
// action type still renders instead of crashing.
const ACTION_META = {
  baseline_generated: { icon: Rocket, label: "Baseline generated", tint: "#38bdf8" },
  event_triggered: { icon: Zap, label: "Event triggered", tint: "#f59e0b" },
  plan_approved: { icon: ShieldCheck, label: "Plan approved", tint: "#34d399" },
  plan_rejected: { icon: ShieldX, label: "Plan rejected", tint: "#f87171" },
};
const DEFAULT_META = { icon: Zap, label: "Action", tint: "#94a3b8" };

function sanitizeDescription(description) {
  return description?.replace(/[^a-zA-Z0-9 :.,()-]/g, " ").replace(/\s+/g, " ").trim();
}

function relativeTime(timestamp) {
  const deltaMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** One entry in the timeline: an icon node on the rail plus its detail card. */
function TimelineEntry({ log, index, previousObjective, isLast }) {
  const meta = ACTION_META[log.action_type] || DEFAULT_META;
  const Icon = meta.icon;

  let TrendIcon = Minus;
  let trendTint = "var(--as-text-tertiary, #64748b)";
  let trendClass = ""; // red-400 / emerald-400 == the old #f87171 / #34d399; darkened by index.css in light theme
  if (log.objective != null && previousObjective != null) {
    if (log.objective > previousObjective) { TrendIcon = ArrowUpRight; trendClass = "text-red-400"; }
    else if (log.objective < previousObjective) { TrendIcon = ArrowDownRight; trendClass = "text-emerald-400"; }
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.6) }}
      className="relative flex gap-5 pb-8 last:pb-0"
    >
      {/* Rail: icon node + connecting line down to the next entry */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="as-icon-tile as-icon-tile-tint"
          style={{ '--as-icon-tint': meta.tint, width: 40, height: 40 }}
        >
          <Icon size={18} />
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-2"
            style={{ background: 'linear-gradient(to bottom, var(--as-hairline-strong), transparent)' }}
          />
        )}
      </div>

      {/* Detail card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="flex-1 min-w-0 rounded-2xl overflow-hidden"
      >
        <MagicCard gradientColor="rgba(255,255,255,0.06)" className="border-white/10 bg-white/[0.02]">
          <div className="relative z-10 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <span className="as-chip as-chip-tint" style={{ '--as-chip-tint': meta.tint }}>
                {meta.label}
              </span>
              <span className="as-small flex items-center gap-1 text-[var(--as-text-tertiary)]">
                <Clock size={12} />
                {relativeTime(log.timestamp)}
                <span className="opacity-60">&middot; {new Date(log.timestamp).toLocaleString()}</span>
              </span>
            </div>

            <p className="as-body text-[var(--as-text-secondary)] mb-3">
              {sanitizeDescription(log.description)}
            </p>

            {log.objective != null && (
              <div className="flex items-center gap-1.5">
                <span className="as-small text-[var(--as-text-tertiary)]">Objective</span>
                <span className="as-numeric text-sm font-semibold text-cyan-300">
                  <NumberTicker value={log.objective} decimalPlaces={1} />
                </span>
                <TrendIcon size={14} className={trendClass} style={trendClass ? undefined : { color: trendTint }} />
              </div>
            )}
          </div>
        </MagicCard>
      </motion.div>
    </motion.li>
  );
}

const AuditLogPage = ({ theme }) => {
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/audit-log`)
      .then(r => r.json())
      .then(data => setAuditLog(data))
      .catch(e => console.error(e));
  }, []);

  const exportAuditLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "aapda_setu_audit_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const lastApproval = useMemo(
    () => [...auditLog].reverse().find(l => l.action_type === 'plan_approved'),
    [auditLog]
  );
  const latestObjective = useMemo(() => {
    const withObjective = [...auditLog].reverse().find(l => l.objective != null);
    return withObjective?.objective ?? null;
  }, [auditLog]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen p-6 md:p-8 pt-28 pb-20 relative overflow-hidden"
    >
      <MeshBackground />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6"
        >
          <div>
            <div className="as-icon-tile as-icon-tile-tint mb-4" style={{ '--as-icon-tint': '#22d3ee' }}>
              <FileText size={20} />
            </div>
            <h1 className="as-title mb-2">System Audit Log</h1>
            <p className="as-body text-[var(--as-text-tertiary)] max-w-xl">
              An immutable record of every intervention, scenario implementation, and
              optimization trigger that has touched the live operational plan.
            </p>
          </div>

          <ShimmerButton
            onClick={exportAuditLog}
            background="rgba(6, 182, 212, 0.1)"
            shimmerColor="rgba(255,255,255,0.4)"
          >
            <span className="text-cyan-400 text-sm font-semibold tracking-wide flex items-center gap-2 px-2">
              <Download className="w-4 h-4" /> Export JSON
            </span>
          </ShimmerButton>
        </motion.div>

        {/* Summary strip: replaces a second header row with two at-a-glance
            stats derived from data already in state - no new fetches. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8 max-w-md"
        >
          <div className="as-glass-quiet rounded-xl px-4 py-3 border border-[var(--as-hairline)]">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Total actions</div>
            <div className="as-numeric text-xl font-bold">
              <NumberTicker value={auditLog.length} />
            </div>
          </div>
          <div className="as-glass-quiet rounded-xl px-4 py-3 border border-[var(--as-hairline)]">
            <div className="as-small text-[var(--as-text-tertiary)] mb-1">Latest objective</div>
            <div className="as-numeric text-xl font-bold text-cyan-300">
              {latestObjective != null ? <NumberTicker value={latestObjective} decimalPlaces={1} /> : '—'}
            </div>
          </div>
        </motion.div>

        {auditLog.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="as-glass rounded-2xl p-12 text-center text-[var(--as-text-tertiary)]"
          >
            No audit logs recorded yet.
          </motion.div>
        ) : (
          <motion.ol
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative"
          >
            {auditLog.map((log, i) => (
              <TimelineEntry
                key={i}
                log={log}
                index={i}
                previousObjective={i > 0 ? auditLog[i - 1].objective : null}
                isLast={i === auditLog.length - 1}
              />
            ))}
          </motion.ol>
        )}
      </div>
    </motion.div>
  );
};

export default AuditLogPage;
