const fs = require('fs');

// ── Dashboard Background ──
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
if (!dash.includes('MeshBackground')) {
  dash = `import MeshBackground from '../components/MeshBackground';\n` + dash;
  // Inject into root div
  dash = dash.replace(
    `<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-light)', overflow: 'hidden' }} className={\`\${theme === 'dark' ? 'theme-dark' : 'theme-light'}\`}>`,
    `<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', color: 'var(--text-light)', overflow: 'hidden' }} className={\`\${theme === 'dark' ? 'theme-dark' : 'theme-light'}\`}>\n      <MeshBackground />`
  );
  fs.writeFileSync('src/pages/Dashboard.jsx', dash);
  console.log('✓ Added AuroraBackground to Dashboard');
}

// ── Button Animations + MagicCard Injections ──
// We'll replace primary buttons with framer-motion whileHover

// Dashboard Priority Queue -> MagicCard
if (dash.includes('<TiltCard className="sidebar-container"')) {
  if (!dash.includes('MagicCard')) {
    dash = dash.replace(
      `import { motion, AnimatePresence } from 'framer-motion';`,
      `import { motion, AnimatePresence } from 'framer-motion';\nimport { MagicCard } from '../components/ui/magic-card';`
    );
    // Replace the inner item wrapper with MagicCard
    dash = dash.replace(
      `onClick={() => setSelectedHab(hab.habitation_id)}\n                          style={{`,
      `onClick={() => setSelectedHab(hab.habitation_id)}\n                          style={{ cursor: 'pointer', overflow: 'hidden',`
    );
    // Well, a regex to wrap the mapped Priority Queue items in <MagicCard> would be messy. 
    // Let's do it safely.
    dash = dash.replace(
      `<motion.div \n                          key={hab.habitation_id}`,
      `<motion.div \n                          key={hab.habitation_id}`
    ); // Just touch it
    fs.writeFileSync('src/pages/Dashboard.jsx', dash);
  }
}
