const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

c = c.replace(/import PlanHealthPanel from '\.\.\/components\/PlanHealthPanel';[\r\n]*/, '');

const startStr = '<PlanHealthPanel currentPlan={currentPlan} onPlanUpdate={handlePlanUpdate} />';
const endStr = '{/* CENTER CONTENT */}';

const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const before = c.substring(0, startIndex);
    // Find the AnimatePresence closing tag before CENTER CONTENT
    
    // We want to replace from startStr up to the end of the TiltCard content
    // The exact HTML before CENTER CONTENT is:
    /*
                  </div>
                </TiltCard>
              </motion.div>
            )}
          </AnimatePresence>
    */
    const replacement = `{healthStatus && healthStatus !== 'HEALTHY' && (
  <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>
      <span style={{ animation: 'unmet-pulse 1.5s infinite' }}>⚠️</span> Plan At Risk
    </div>
    <Link to="/plan-health" style={{ color: '#f87171', fontSize: '12px', textDecoration: 'underline' }}>View Details</Link>
  </div>
)}

<EventControls onPlanUpdate={handlePlanUpdate} sites={sites} habitations={habitations} routesData={routesData} />
<Legend />

<div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
  <Link to="/plan-health" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>View Full Plan Health →</Link>
  <Link to="/what-if" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>What-If Analysis →</Link>
  <Link to="/audit-log" style={{ display: 'block', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>System Audit Log →</Link>
</div>

                  </div>
                </TiltCard>
              </motion.div>
            )}
          </AnimatePresence>
          
          `;
    
    // So we replace from startStr to the </AnimatePresence> tag that comes before CENTER CONTENT
    // Let's just find `</AnimatePresence>` between startIndex and endIndex
    const middleStr = c.substring(startIndex, endIndex);
    const animatePresenceIdx = middleStr.lastIndexOf('</AnimatePresence>');
    
    if (animatePresenceIdx !== -1) {
        c = c.substring(0, startIndex) + replacement + c.substring(startIndex + animatePresenceIdx + '</AnimatePresence>'.length);
        
        // Let's also remove `const [showAuditLog, setShowAuditLog] = useState(false);`
        c = c.replace(/const \[showAuditLog, setShowAuditLog\] = useState\(false\);[\r\n]*/, '');
        fs.writeFileSync('src/pages/Dashboard.jsx', c);
        console.log('Patched successfully!');
    }
}
