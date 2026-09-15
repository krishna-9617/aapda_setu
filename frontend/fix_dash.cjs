const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// Normalize line endings for matching
const search = "    }\r\n          boxShadow:";
const replace = `    };

  const displayHabs = pendingPlanData?.pending_data?.habitations || habitations;
  const sortedHabs = Object.values(displayHabs).sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'} style={{ display: 'flex', width: '100vw', height: '100vh', paddingTop: '100px', overflow: 'hidden', backgroundColor: 'var(--bg)', backgroundImage: 'var(--bg-grad)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>

      {/* BACKGROUND MAP LAYER */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        perspective: '1200px',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          width: '100%', height: '100%',
          transform: 'rotateX(4.5deg) translateY(-1%) scale(1.03)',
          transformStyle: 'preserve-3d',
          boxShadow:`;

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync('src/pages/Dashboard.jsx', c);
  console.log('Dashboard.jsx FIXED!');
} else {
  console.log('STILL NOT FOUND');
  // Try with just \n
  const search2 = "    }\n          boxShadow:";
  if (c.includes(search2)) {
    c = c.replace(search2, replace);
    fs.writeFileSync('src/pages/Dashboard.jsx', c);
    console.log('Dashboard.jsx FIXED (LF)!');
  } else {
    console.log('Neither match found');
  }
}
