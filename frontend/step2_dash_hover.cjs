const fs = require('fs');

let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

if (!dash.includes('motion(Link)')) {
  // We can just use motion.div wrapped around Link, or replace Link with motion(Link)
  // But motion(Link) requires `const MotionLink = motion(Link);`
  
  if (dash.includes('<Link key={to}')) {
    dash = dash.replace(
      `    <Link key={to} to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>`,
      `    <motion.div key={to} whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(255,255,255,0.15)' }} transition={{ duration: 0.2 }}>\n    <Link to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>`
    );
    dash = dash.replace(
      `    </Link>\n  ))` ,
      `    </Link>\n    </motion.div>\n  ))`
    );
    fs.writeFileSync('src/pages/Dashboard.jsx', dash);
    console.log('✓ Added hover animation to Dashboard quick links');
  }
}
