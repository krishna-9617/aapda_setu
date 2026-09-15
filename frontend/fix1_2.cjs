/**
 * Fix 1: Remove EventControls from Dashboard sidebar, add Field Report link
 * Fix 2: Reorder Navbar links
 */
const fs = require('fs');

// ── FIX 1: Dashboard sidebar ───────────────────────────────────────────────
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Remove the EventControls import
dash = dash.replace(`import EventControls from '../components/EventControls';\r\n`, '');
dash = dash.replace(`import EventControls from '../components/EventControls';\n`, '');

// Remove EventControls JSX usage + Legend + existing nav links block
// The block is from <EventControls ... /> to the closing </div> of the nav links
const REMOVE_START = `<EventControls onPlanUpdate={handlePlanUpdate} sites={sites} habitations={habitations} routesData={routesData} />\r\n<Legend />\r\n\r\n<div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>\r\n  <Link to=\"/plan-health\" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>View Full Plan Health →</Link>\r\n  <Link to=\"/what-if\" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>What-If Analysis →</Link>\r\n  <Link to=\"/audit-log\" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>System Audit Log →</Link>\r\n</div>`;

const REPLACE_WITH = `
<div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
  {[
    { to: '/plan-health', label: '🛡 Plan Health', sub: healthStatus && healthStatus !== 'HEALTHY' ? '⚠ Attention needed' : 'Constraint analysis', accent: healthStatus && healthStatus !== 'HEALTHY' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', border: healthStatus && healthStatus !== 'HEALTHY' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.05)' },
    { to: '/field-report', label: '📡 Report Field Incident', sub: 'Bridge collapse · Capacity drop · Rainfall', accent: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' },
    { to: '/what-if', label: '🔮 What-If Analysis', sub: 'Simulate scenarios', accent: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
    { to: '/audit-log', label: '📋 Audit Log', sub: 'All system decisions', accent: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
  ].map(({ to, label, sub, accent, border }) => (
    <Link key={to} to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>
      {label}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginTop: '2px' }}>{sub}</div>
    </Link>
  ))}
</div>`;

if (dash.includes(REMOVE_START)) {
  dash = dash.replace(REMOVE_START, REPLACE_WITH);
  console.log('✓ Fix 1a: Removed EventControls, added quick-links');
} else {
  // Try LF variant
  const REMOVE_START_LF = REMOVE_START.replace(/\r\n/g, '\n');
  if (dash.includes(REMOVE_START_LF)) {
    dash = dash.replace(REMOVE_START_LF, REPLACE_WITH);
    console.log('✓ Fix 1a (LF): Removed EventControls, added quick-links');
  } else {
    // Partial removal - at least remove the EventControls line
    dash = dash.replace(`<EventControls onPlanUpdate={handlePlanUpdate} sites={sites} habitations={habitations} routesData={routesData} />`, '/* EventControls removed — use /field-report */');
    console.log('⚠ Fix 1a partial: EventControls line replaced only');
  }
}

// Also remove Legend from sidebar since we removed its usage context
dash = dash.replace('\n<Legend />\n', '\n');

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('✓ Fix 1: Dashboard.jsx updated');

// ── FIX 2: Navbar link order ───────────────────────────────────────────────
let navbar = fs.readFileSync('src/components/Navbar.jsx', 'utf8');

const OLD_LINKS = `  const links = [
    { name: "Home", path: "/" },
    { name: "Live Dashboard", path: "/dashboard" },
    { name: "Plan Health", path: "/plan-health" },
    { name: "What-If Analysis", path: "/what-if" },
    { name: "Field Report", path: "/field-report" },
    { name: "Audit Log", path: "/audit-log" }
  ];`;

const NEW_LINKS = `  const links = [
    { name: "Home", path: "/" },
    { name: "Live Dashboard", path: "/dashboard" },
    { name: "Field Report", path: "/field-report" },
    { name: "What-If Analysis", path: "/what-if" },
    { name: "Plan Health", path: "/plan-health" },
    { name: "Audit Log", path: "/audit-log" }
  ];`;

if (navbar.includes(OLD_LINKS)) {
  navbar = navbar.replace(OLD_LINKS, NEW_LINKS);
  fs.writeFileSync('src/components/Navbar.jsx', navbar);
  console.log('✓ Fix 2: Navbar link order updated');
} else {
  console.log('⚠ Fix 2: Could not find exact links block');
}
