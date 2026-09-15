/**
 * Part 6: Upgrade ExplainabilityPanel with animated stat widgets
 * - Fleet requirement: icon-based mini stat cards
 * - ML susceptibility: animated gauge rings instead of plain text
 * - Critical care population: distinct badge/callout
 * - Classification stability: animated indicator bar
 */
const fs = require('fs');

let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// 1. Add a RadialGauge helper component right before ExplainabilityPanelContent
const radialGauge = `
// Animated radial gauge for ML susceptibility scores
const RadialGauge = ({ value, color, size = 56 }) => {
  const r = (size / 2) - 5;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(1, value));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
};

`;

dash = dash.replace(
  'const ExplainabilityPanelContent = ({',
  radialGauge + 'const ExplainabilityPanelContent = ({'
);

// 2. Replace the Classification Stability section (plain italic text) with animated bar
const oldStability = `        {hab.classification_stability !== undefined && (
          <div style={{ marginBottom: '16px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
            Classification stable in {(hab.classification_stability * 100).toFixed(1)}% of weight-perturbation runs.
          </div>
        )}`;

const newStability = `        {hab.classification_stability !== undefined && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.5px' }}>Classification Stability</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc' }}>{(hab.classification_stability * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: \`\${(hab.classification_stability * 100).toFixed(0)}%\` }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>Stable across weight-perturbation runs</div>
          </div>
        )}`;

dash = dash.replace(oldStability, newStability);

// 3. Upgrade ML Flood Susceptibility section with gauge ring
const oldFloodML = `        {hab.ml_contribution?.promoted && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Flood Susceptibility</h4>
            <div style={{ fontSize: '13px', color: 'var(--text-strong)', marginBottom: '4px' }}>
              {(hab.ml_contribution.phi * 100).toFixed(1)}% ({hab.ml_contribution.model}, AUC {hab.ml_contribution.auc})
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Dataset: naiyakhalid/flood-prediction-dataset
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontStyle: 'italic' }}>
              *Habitation features are estimated proxies, not directly measured.
            </div>
          </div>
        )}`;

const newFloodML = `        {hab.ml_contribution?.promoted && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.06)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Flood Susceptibility</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RadialGauge value={hab.ml_contribution.phi} color="#38bdf8" size={56} />
                <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 700, color: '#38bdf8', transform: 'rotate(0deg)' }}>{(hab.ml_contribution.phi * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-strong)', fontWeight: 600, marginBottom: '2px' }}>
                  φ = {(hab.ml_contribution.phi * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hab.ml_contribution.model} · AUC {hab.ml_contribution.auc}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', fontStyle: 'italic' }}>*Estimated proxies</div>
              </div>
            </div>
          </div>
        )}`;

dash = dash.replace(oldFloodML, newFloodML);

// 4. Upgrade ML Landslide Susceptibility section
const oldLandslideML = `        {hab.ml_contribution_landslide?.promoted && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Landslide Susceptibility</h4>
            <div style={{ fontSize: '13px', color: 'var(--text-strong)', marginBottom: '4px' }}>
              {(hab.ml_contribution_landslide.phi * 100).toFixed(1)}% ({hab.ml_contribution_landslide.model}, AUC {hab.ml_contribution_landslide.auc})
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Dataset: sreeragunandha/landslide-prediction-dataset
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontStyle: 'italic' }}>
              *Habitation features are estimated proxies, not directly measured.
            </div>
          </div>
        )}`;

const newLandslideML = `        {hab.ml_contribution_landslide?.promoted && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.06)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ML Landslide Susceptibility</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RadialGauge value={hab.ml_contribution_landslide.phi} color="#f59e0b" size={56} />
                <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{(hab.ml_contribution_landslide.phi * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-strong)', fontWeight: 600, marginBottom: '2px' }}>
                  φ = {(hab.ml_contribution_landslide.phi * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hab.ml_contribution_landslide.model} · AUC {hab.ml_contribution_landslide.auc}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', fontStyle: 'italic' }}>*Estimated proxies</div>
              </div>
            </div>
          </div>
        )}`;

dash = dash.replace(oldLandslideML, newLandslideML);

// 5. Upgrade Critical Care Population to a more prominent badge
const oldCritCare = `        {hab.critical_care_population > 0 && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🏥</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#f87171', fontWeight: 600, letterSpacing: '0.5px' }}>Critical Care Population</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fca5a5' }}>{hab.critical_care_population} people (bedridden / oxygen / maternal)</span>
            </div>
          </div>
        )}`;

const newCritCare = `        {hab.critical_care_population > 0 && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
            style={{ marginBottom: '24px', padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 0 20px rgba(239,68,68,0.08)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '12px', backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px' }}>🏥</div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Critical Care Required</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#fca5a5', display: 'block', lineHeight: 1.1 }}>{hab.critical_care_population}</span>
              <span style={{ fontSize: '11px', color: 'rgba(252,165,165,0.7)' }}>people — bedridden / oxygen / maternal</span>
            </div>
          </motion.div>
        )}`;

dash = dash.replace(oldCritCare, newCritCare);

// 6. Upgrade Fleet Needed row (inside assignment section) to icon-based mini stat cards
const oldFleet = `            {(assignment.buses_required !== undefined || assignment.boats_required !== undefined) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fleet Needed:</span>
                <strong style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                  🚌 {assignment.buses_required || 0} buses, 🛶 {assignment.boats_required || 0} boats
                </strong>
              </div>
            )}`;

const newFleet = `            {(assignment.buses_required !== undefined || assignment.boats_required !== undefined) && (
              <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>Transport Fleet Required</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
                    style={{ flex: 1, padding: '8px 10px', backgroundColor: 'rgba(56,189,248,0.08)', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>🚌</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>{assignment.buses_required || 0}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Buses</div>
                  </motion.div>
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
                    style={{ flex: 1, padding: '8px 10px', backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: '10px', border: '1px solid rgba(14,165,233,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>🛶</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>{assignment.boats_required || 0}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Boats</div>
                  </motion.div>
                </div>
              </div>
            )}`;

dash = dash.replace(oldFleet, newFleet);

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('Dashboard.jsx enhanced with data highlight widgets.');
