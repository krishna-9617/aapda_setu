const fs = require('fs');
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// Match from {/* DEMO MODE BANNER */} down to </div>
dash = dash.replace(/\{\/\*\s*DEMO MODE BANNER\s*\*\/\}[\s\S]*?Demo mode: events[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('Nuked Demo Banner');
