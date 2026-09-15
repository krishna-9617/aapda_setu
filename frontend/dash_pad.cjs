const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
c = c.replace(/paddingTop: '64px'/g, "paddingTop: '100px'");
c = c.replace(/top: '64px'/g, "top: '100px'");
fs.writeFileSync('src/pages/Dashboard.jsx', c);
