const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

c = c.replace(/const WhatIfControls = \(\{.*?\}\) => \{[\s\S]*?return \([\s\S]*?\};\n/g, '');
c = c.replace(/import PlanHealthPanel from '\.\.\/components\/PlanHealthPanel';\n/g, '');

if (!c.includes('import { Link } from')) {
  c = c.replace(/import React.*?from 'react';/g, "$&\nimport { Link } from 'react-router-dom';");
}

c = c.replace(/const \[selectedHab, setSelectedHab\] = useState\(null\);/g, 'const [selectedHab, setSelectedHab] = useState(null);\n  const [healthStatus, setHealthStatus] = useState(null);');

c = c.replace(/const fetchCurrentData = async \(\) => \{/g, 'useEffect(() => {\n    if (currentPlan) {\n      fetch(`${API_BASE_URL}/plans/health`).then(r => r.json()).then(d => setHealthStatus(d.status)).catch(console.error);\n    }\n  }, [currentPlan]);\n\n  const fetchCurrentData = async () => {');

const sidebarRegex = /<PlanHealthPanel currentPlan=\{currentPlan\} onPlanUpdate=\{handlePlanUpdate\} \/>\s*<EventControls[\s\S]*?\/>\s*<WhatIfControls[\s\S]*?\/>\s*<Legend \/>\s*\{\/\* PLAN HISTORY \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;

const replacement = `{healthStatus && healthStatus !== 'HEALTHY' && (
  <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>
      <span style={{ animation: 'unmet-pulse 1.5s infinite' }}>⚠️</span> Plan At Risk
    </div>
    <Link to="/plan-health" style={{ color: '#f87171', fontSize: '12px', textDecoration: 'underline' }}>View Details</Link>
  </div>
)}

<EventControls onPlanUpdate={handlePlanUpdate} sites={sites} habitations={habitations} routesData={routesData} />
<Legend />

<div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
  <Link to="/plan-health" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>View Full Plan Health →</Link>
  <Link to="/what-if" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>What-If Analysis →</Link>
  <Link to="/audit-log" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>System Audit Log →</Link>
</div>

</div>
</div>
</div>`;

c = c.replace(sidebarRegex, replacement);

c = c.replace(/\{\/\* AUDIT LOG MODAL \*\/\}[\s\S]*?<\/AnimatePresence>/, '');

fs.writeFileSync('src/pages/Dashboard.jsx', c);
