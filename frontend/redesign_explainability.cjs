/**
 * Redesign ExplainabilityPanelContent with premium widgets:
 * - Animated SVG gauge rings for ML susceptibility scores
 * - NumberTicker fleet stat tiles for buses/boats
 * - Pulsing critical care callout
 * - Animated progress bar for classification stability
 * - Colour-coded exclusion cards for filtered sites
 * - Staggered entrance via framer-motion
 */
const fs = require('fs');

let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// ── 1. Inject NumberTicker import right after existing imports ──────────────
const importInsert = `import NumberTicker from '../components/ui/number-ticker';\n`;
if (!dash.includes('number-ticker')) {
  // Insert after the last top-level import in the file
  dash = dash.replace(
    `import { API_BASE_URL } from '../config';`,
    `import { API_BASE_URL } from '../config';\n${importInsert}`
  );
}

// ── 2. Replace the ENTIRE ExplainabilityPanelContent function ───────────────
const OLD_START = `const ExplainabilityPanelContent = ({ habitationId, habitations, sites, currentPlan, routesData, onClose }) => {\r\n`;
const OLD_START_LF = `const ExplainabilityPanelContent = ({ habitationId, habitations, sites, currentPlan, routesData, onClose }) => {\n`;

// Find end: the closing `};\n` right before WhatIfControls
const BEFORE_WHAT_IF = `const WhatIfControls = (`;

const startIdx = dash.indexOf(OLD_START) !== -1 ? dash.indexOf(OLD_START) : dash.indexOf(OLD_START_LF);
const endIdx   = dash.indexOf(BEFORE_WHAT_IF);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find ExplainabilityPanelContent or WhatIfControls', { startIdx, endIdx });
  process.exit(1);
}

// The CRLF file section is from startIdx to endIdx (exclusive).
// Build replacement:
const newComponent = `const ExplainabilityPanelContent = ({ habitationId, habitations, sites, currentPlan, routesData, onClose }) => {
  if (!habitationId || !currentPlan || !habitations[habitationId]) return null;
  const hab = habitations[habitationId];
  const assignment = currentPlan.assignments.find(a => a.habitation_id === habitationId);
  const unmet = currentPlan.unmet_demand[habitationId] || 0;

  const bandColor = hab.red_zone_band === 'critical' ? '#ef4444'
    : hab.red_zone_band === 'high'     ? '#f97316'
    : hab.red_zone_band === 'moderate' ? '#f59e0b' : '#10b981';

  const bandRgb = hab.red_zone_band === 'critical' ? '239,68,68'
    : hab.red_zone_band === 'high'     ? '249,115,22'
    : hab.red_zone_band === 'moderate' ? '245,158,11' : '16,185,129';

  // ── Animated gauge ring (SVG) ────────────────────────────────────────────
  const GaugeRing = ({ value, color, size = 64 }) => {
    const r = (size / 2) - 6;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(1, value));
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 800, color, lineHeight: 1 }}>
          {(value * 100).toFixed(0)}%
        </div>
      </div>
    );
  };

  // ── Exclusion reason → icon + colour ────────────────────────────────────
  const parseExclusion = (reason) => {
    const r = reason.toLowerCase();
    if (r.includes('hazard') || r.includes('flood') || r.includes('landslide') || r.includes('unsafe'))
      return { icon: '⛔', color: '#ef4444', rgb: '239,68,68', tag: 'HAZARD ZONE' };
    if (r.includes('route') || r.includes('road') || r.includes('bridge') || r.includes('access') || r.includes('no route'))
      return { icon: '🚧', color: '#f97316', rgb: '249,115,22', tag: 'NO ROUTE' };
    if (r.includes('capacity') || r.includes('full') || r.includes('zero'))
      return { icon: '🏚', color: '#f59e0b', rgb: '245,158,11', tag: 'NO CAPACITY' };
    if (r.includes('drain') || r.includes('sanit') || r.includes('water'))
      return { icon: '💧', color: '#38bdf8', rgb: '56,189,248', tag: 'INFRA RISK' };
    return { icon: '⚠️', color: '#a78bfa', rgb: '167,139,250', tag: 'FILTERED' };
  };

  // ── Stagger container ────────────────────────────────────────────────────
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  const filteringReasons = currentPlan?.filtering_reasons?.[habitationId] || [];
  const buses = assignment?.buses_required ?? null;
  const boats = assignment?.boats_required ?? null;
  const showFleet = buses !== null || boats !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: \`linear-gradient(135deg, rgba(\${bandRgb},0.12) 0%, transparent 60%)\`, position: 'relative' }}>
        <button onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
            width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>×</button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: \`linear-gradient(135deg, rgba(\${bandRgb},0.3), rgba(\${bandRgb},0.1))\`,
            border: \`1px solid rgba(\${bandRgb},0.4)\`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {hab.dominant_hazard === 'landslide' ? '⛰️' : '🌊'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 700, color: '#f1f5f9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 32 }}>
              {hab.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                {hab.dominant_hazard || 'flood'} risk
              </span>
              <span style={{ display: 'inline-flex', padding: '1px 7px', borderRadius: 6,
                background: \`rgba(\${bandRgb},0.18)\`, border: \`1px solid rgba(\${bandRgb},0.35)\`,
                color: bandColor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {hab.red_zone_band}
              </span>
              {hab.data_source && (
                <span style={{ fontSize: 10, color: '#38bdf8', background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.2)', padding: '1px 5px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {hab.data_source === 'estimated' ? 'DEMO' : hab.data_source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pop / Hazard mini row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Population</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{hab.population.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Hazard Type</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginTop: 2, textTransform: 'capitalize' }}>
              {hab.dominant_hazard || 'Flood'}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY (staggered) ── */}
      <motion.div
        key={habitationId}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >

        {/* ── CRITICAL CARE CALLOUT (highest priority if present) ── */}
        {hab.critical_care_population > 0 && (
          <motion.div variants={itemVariants}>
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 18px rgba(239,68,68,0.35)', '0 0 0px rgba(239,68,68,0)'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ padding: '14px 16px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0.06) 100%)',
                border: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏥</div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#f87171', fontWeight: 700, letterSpacing: '0.6px', marginBottom: 2 }}>
                  ⚠ Critical Care Required
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fca5a5', lineHeight: 1 }}>
                  <NumberTicker value={hab.critical_care_population} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(252,165,165,0.65)', marginTop: 2 }}>
                  bedridden · oxygen · maternal
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── ML SUSCEPTIBILITY GAUGES ── */}
        {(hab.ml_contribution?.promoted || hab.ml_contribution_landslide?.promoted) && (
          <motion.div variants={itemVariants}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              fontWeight: 700, letterSpacing: '0.7px', marginBottom: 8 }}>ML Risk Assessment</div>
            <div style={{ display: 'flex', gap: 8 }}>

              {hab.ml_contribution?.promoted && (
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.04))',
                  border: '1px solid rgba(56,189,248,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GaugeRing value={hab.ml_contribution.phi} color="#38bdf8" size={60} />
                  <div>
                    <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flood</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {hab.ml_contribution.model}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.7)', marginTop: 1 }}>
                      AUC {hab.ml_contribution.auc}
                    </div>
                  </div>
                </div>
              )}

              {hab.ml_contribution_landslide?.promoted && (
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))',
                  border: '1px solid rgba(245,158,11,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GaugeRing value={hab.ml_contribution_landslide.phi} color="#f59e0b" size={60} />
                  <div>
                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landslide</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {hab.ml_contribution_landslide.model}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(245,158,11,0.7)', marginTop: 1 }}>
                      AUC {hab.ml_contribution_landslide.auc}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 5, textAlign: 'right', fontStyle: 'italic' }}>
              *φ is estimated from proxies, not direct field data
            </div>
          </motion.div>
        )}

        {/* ── CLASSIFICATION STABILITY BAR ── */}
        {hab.classification_stability !== undefined && (
          <motion.div variants={itemVariants}>
            <div style={{ padding: '12px 14px', borderRadius: 14,
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Classification Stability
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a5b4fc' }}>
                  {(hab.classification_stability * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: \`\${(hab.classification_stability * 100).toFixed(0)}%\` }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                  style={{ height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%)' }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.5)', marginTop: 5 }}>
                Stable across weight-perturbation runs
              </div>
            </div>
          </motion.div>
        )}

        {/* ── FLEET REQUIREMENT TILES ── */}
        {showFleet && (
          <motion.div variants={itemVariants}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              fontWeight: 700, letterSpacing: '0.7px', marginBottom: 8 }}>Transport Fleet Required</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.04))',
                border: '1px solid rgba(56,189,248,0.2)' }}>
                <div style={{ fontSize: 22, marginBottom: 3 }}>🚌</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>
                  <NumberTicker value={buses ?? 0} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(56,189,248,0.6)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Buses</div>
              </div>
              <div style={{ flex: 1, padding: '12px 10px', borderRadius: 14, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.04))',
                border: '1px solid rgba(14,165,233,0.2)' }}>
                <div style={{ fontSize: 22, marginBottom: 3 }}>🛶</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>
                  <NumberTicker value={boats ?? 0} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(14,165,233,0.6)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Boats</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── FILTERED CANDIDATE SITES ── */}
        {filteringReasons.length > 0 && (
          <motion.div variants={itemVariants}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
              fontWeight: 700, letterSpacing: '0.7px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b',
                boxShadow: '0 0 6px #f59e0b', display: 'inline-block' }} />
              Solver Exclusions ({filteringReasons.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {filteringReasons.map((reason, idx) => {
                const ex = parseExclusion(reason);
                return (
                  <motion.div key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx, duration: 0.3 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 10,
                      background: \`rgba(\${ex.rgb},0.06)\`, border: \`1px solid rgba(\${ex.rgb},0.2)\` }}>
                    <span style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>{ex.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: ex.color, textTransform: 'uppercase',
                        letterSpacing: '0.5px', marginBottom: 2 }}>{ex.tag}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{reason}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── CURRENT ASSIGNMENT ── */}
        <motion.div variants={itemVariants}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
            fontWeight: 700, letterSpacing: '0.7px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8',
              boxShadow: '0 0 6px #38bdf8', display: 'inline-block' }} />
            Current Assignment
          </div>

          {assignment ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.07), rgba(56,189,248,0.02))',
              border: '1px solid rgba(56,189,248,0.18)', borderRadius: 14, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 8 }}>

              {[
                { label: 'Phase', value: 'Immediate Relocation', color: '#38bdf8' },
                { label: 'Site', value: sites[assignment.site_id]?.name || assignment.site_id, color: '#f1f5f9' },
                { label: 'Route', value: assignment.route_id, color: '#f1f5f9' },
                { label: 'People', value: \`\${assignment.people_count} assigned\`, color: '#10b981' },
                ...(routesData?.[assignment.route_id]
                  ? [{ label: 'Travel', value: \`\${routesData[assignment.route_id].travel_time_min} mins\`, color: '#f1f5f9' }]
                  : [])
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 7, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                  <strong style={{ fontSize: 12, color }}>{value}</strong>
                </div>
              ))}

              {/* Healthcare match */}
              {hab.critical_care_population > 0 && sites[assignment.site_id]?.has_healthcare && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>✅</span>
                  <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Healthcare-capable shelter confirmed</span>
                </div>
              )}

              {/* Supplies */}
              {(() => {
                const siteAssignments = currentPlan.assignments.filter(a => a.site_id === assignment.site_id);
                const total = siteAssignments.reduce((s, a) => s + a.people_count, 0);
                const site = sites[assignment.site_id];
                const foodUsed = total * 3;
                const foodTotal = site?.food_supply_units || 0;
                const medUsed = Math.ceil(total / 20);
                const medTotal = site?.medical_supply_units || 0;
                return (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {[
                      { label: 'Food', used: foodUsed, total: foodTotal, unit: 'units' },
                      { label: 'Medical', used: medUsed, total: medTotal, unit: 'kits' }
                    ].map(({ label, used, total: tot, unit }) => {
                      const pct = tot > 0 ? Math.min(1, used / tot) : 0;
                      const overCap = used >= tot;
                      return (
                        <div key={label} style={{ flex: 1, padding: '8px 10px', borderRadius: 10,
                          background: overCap ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
                          border: \`1px solid \${overCap ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.18)'}\` }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{ height: '100%', width: \`\${pct * 100}%\`, borderRadius: 2,
                              background: overCap ? '#ef4444' : '#10b981' }} />
                          </div>
                          <div style={{ fontSize: 10, color: overCap ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                            {used}/{tot} {unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {unmet > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Unmet Demand</span>
                  <strong style={{ color: '#ef4444', fontSize: 12 }}>{unmet} people</strong>
                </div>
              )}

              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5, fontStyle: 'italic' }}>
                Assigned by CP-SAT solver — shortest travel time within exact space, food & medical limits.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 14, padding: 14 }}>
              <p style={{ color: '#fca5a5', margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                No viable route or capacity available. All <strong>{unmet}</strong> people are unassigned.
              </p>
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
};

`;

// Replace the old component with the new one
dash = dash.substring(0, startIdx) + newComponent + dash.substring(endIdx);

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('✓ ExplainabilityPanelContent redesigned successfully');
