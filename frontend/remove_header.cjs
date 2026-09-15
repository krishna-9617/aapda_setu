const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
const searchStr = `<div style={{ position: 'relative', padding: '24px 24px 24px 72px', borderBottom: '1px solid var(--panel-border-light)', background: 'linear-gradient(to right, rgba(56, 189, 248, 0.1), transparent)' }}>`;
const endStr = `<div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>`;
const startIdx = code.indexOf(searchStr);
const endIdx = code.indexOf(endStr);
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
  fs.writeFileSync('src/pages/Dashboard.jsx', code);
  console.log('Removed duplicate sidebar header');
} else {
  console.log('Could not find duplicate sidebar header');
}
