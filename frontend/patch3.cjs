const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

c = c.replace(/import PlanHealthPanel from '\.\.\/components\/PlanHealthPanel';[\r\n]*/, '');

const startStr = '<PlanHealthPanel currentPlan={currentPlan} onPlanUpdate={handlePlanUpdate} />';
const endStr = '{/* AUDIT LOG MODAL */}';

const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const before = c.substring(0, startIndex);
    // Find the end of the divs before AUDIT LOG MODAL
    // Wait, let's just replace from startStr to the last </div> before endStr
    const after = c.substring(endIndex);
    
    // Actually, there are a bunch of closing divs before AUDIT LOG MODAL
    const between = c.substring(startIndex, endIndex);
    const divsRegex = /(<\/div>\s*){3}$/; // match the last 3 closing divs
    
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
</div>
`;
    
    c = before + replacement + "\n" + after;
    c = c.replace(/\{\/\* AUDIT LOG MODAL \*\/\}[\s\S]*?<\/AnimatePresence>/, '');
    fs.writeFileSync('src/pages/Dashboard.jsx', c);
    console.log('Patched Dashboard!');
} else {
    console.log('Could not find boundaries', startIndex, endIndex);
}
