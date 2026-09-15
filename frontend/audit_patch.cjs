const fs = require('fs');
let c = fs.readFileSync('src/pages/AuditLogPage.jsx', 'utf-8');

// Replace TableBody contents with stagger
const oldMap = `auditLog.map((log, i) => (
                      <TableRow 
                        key={i}
                        className="border-white/5 hover:bg-white/[0.05] transition-colors group cursor-default"
                      >`;
const newMap = `auditLog.map((log, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.05] transition-colors group cursor-default"
                      >`;

c = c.replace(oldMap, newMap);
c = c.replace(/<\/TableRow>\n                    \)\)/g, '</motion.tr>\n                    ))');

fs.writeFileSync('src/pages/AuditLogPage.jsx', c);
console.log('AuditLogPage patched!');
