const fs = require('fs');

let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// 1. Remove Demo Mode Banner
const demoBanner = `{/* DEMO MODE BANNER */}
      <div style={{ position: 'fixed', top: '100px', left: 0, right: 0, height: '24px', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: '#f59e0b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', backdropFilter: 'blur(4px)' }}>
        Demo mode: events and some data are simulated for illustration.
      </div>`;
dash = dash.replace(demoBanner, '');

// 1b. The same demo banner but maybe CRLF?
const demoBannerCRLF = demoBanner.replace(/\n/g, '\r\n');
dash = dash.replace(demoBannerCRLF, '');

// 2. Remove WhatIfControls (from `const WhatIfControls = ...` to the closing `};` before `const Dashboard =`)
const wifStart = dash.indexOf("const WhatIfControls = ({ currentPlan, habitations, onPlanUpdate }) => {");
const dashStart = dash.indexOf("const Dashboard = ({ theme }) => {");
if (wifStart !== -1 && dashStart !== -1) {
  dash = dash.substring(0, wifStart) + "\n\n" + dash.substring(dashStart);
}

// 3. Remove exportAuditLog function
const auditStart = dash.indexOf("  const exportAuditLog = () => {");
const auditEndStr = "downloadAnchorNode.remove();\n  };";
const auditEndStrCRLF = "downloadAnchorNode.remove();\r\n  };";
let auditEnd = dash.indexOf(auditEndStr, auditStart);
if (auditEnd === -1) {
  auditEnd = dash.indexOf(auditEndStrCRLF, auditStart);
  if (auditEnd !== -1) auditEnd += auditEndStrCRLF.length;
} else {
  auditEnd += auditEndStr.length;
}
if (auditStart !== -1 && auditEnd !== -1) {
  dash = dash.substring(0, auditStart) + dash.substring(auditEnd);
}

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log("Dashboard.jsx updated successfully");
