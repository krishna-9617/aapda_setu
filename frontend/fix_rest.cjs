const fs = require('fs');

// 1. Remove dead WhatIfControls from Dashboard.jsx
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
const wifStart = dash.indexOf("const WhatIfControls = ({ currentPlan, habitations, onPlanUpdate }) => {");
const wifEnd = dash.indexOf("};\r\n\r\n\r\nconst Dashboard");
if (wifStart !== -1 && wifEnd !== -1) {
  dash = dash.substring(0, wifStart) + dash.substring(wifEnd + 5); // +5 for "};\r\n\r\n"
  console.log('Removed WhatIfControls from Dashboard');
} else {
  console.log('Could not find WhatIfControls boundaries:', wifStart, wifEnd);
  // Try with \n
  const wifEnd2 = dash.indexOf("};\n\n\nconst Dashboard");
  if (wifEnd2 !== -1 && wifStart !== -1) {
    dash = dash.substring(0, wifStart) + dash.substring(wifEnd2 + 4);
    console.log('Removed WhatIfControls (LF)');
  }
}
fs.writeFileSync('src/pages/Dashboard.jsx', dash);

// 2. Fix AuditLogPage padding
let audit = fs.readFileSync('src/pages/AuditLogPage.jsx', 'utf-8');
audit = audit.replace('p-8 pt-24 pb-20', 'p-8 pt-28 pb-20');
fs.writeFileSync('src/pages/AuditLogPage.jsx', audit);
console.log('Fixed AuditLogPage padding');

// 3. Clean up App.jsx - remove PlaceholderPage
let app = fs.readFileSync('src/App.jsx', 'utf-8');
app = app.replace(/const PlaceholderPage[\s\S]*?\);\r?\n\r?\n/, '');
fs.writeFileSync('src/App.jsx', app);
console.log('Removed PlaceholderPage from App.jsx');
