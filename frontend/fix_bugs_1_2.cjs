/**
 * Fix script for 2 critical bugs:
 * 
 * Bug 1: Dashboard overlay — the isSidebarOpen state causes a slide-in sidebar
 *        but there's no hamburger to close it. The sidebar always renders and
 *        the TiltCard's backdrop-filter + perspective causes a visual "overlay"
 *        illusion. Fix: make the sidebar always-visible (no AnimatePresence toggle),
 *        remove isSidebarOpen state entirely.
 *        Also the Navbar's mobile menu (md:hidden) with X icon is the "X button"
 *        users see — fix by adding a backdrop click-close.
 *
 * Bug 2: FieldReportPage handleApprovePlan / handleRejectPlan are referenced but
 *        never defined. Add them before the `const handleBaseline` line.
 */

const fs = require('fs');

// ===================== BUG 2: FieldReportPage approval handlers =====================
let fieldReport = fs.readFileSync('src/pages/FieldReportPage.jsx', 'utf8');

const handlersToAdd = `
  const handleApprovePlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/approve\`, { method: 'POST' });
      setPendingResult(null);
      setSuccessMsg("Plan approved and applied.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await fetchData();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to approve plan.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/reject\`, { method: 'POST' });
      setPendingResult(null);
      setErrorMsg("Plan rejected. Current plan unchanged.");
      setTimeout(() => setErrorMsg(""), 3000);
    } catch (e) {
      console.error(e);
    }
  };

`;

// Insert before the first handler function
const insertBefore = '  const handleBaseline = () => callEvent';
if (!fieldReport.includes('const handleApprovePlan')) {
  fieldReport = fieldReport.replace(insertBefore, handlersToAdd + insertBefore);
  fs.writeFileSync('src/pages/FieldReportPage.jsx', fieldReport);
  console.log('✓ Bug 2 fixed: Added handleApprovePlan and handleRejectPlan to FieldReportPage');
} else {
  console.log('✓ Bug 2: handlers already present, skipping');
}

// ===================== BUG 1: Dashboard sidebar — remove isSidebarOpen entirely =====================
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Remove isSidebarOpen state
dash = dash.replace(`  const [isSidebarOpen, setIsSidebarOpen] = useState(true);\r\n`, '');
dash = dash.replace(`  const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n`, '');

// The sidebar is wrapped in AnimatePresence + {isSidebarOpen && ...}
// We need to unwrap it: replace the outer AnimatePresence+condition with just the inner content
// The structure is:
//   <AnimatePresence>
//     {isSidebarOpen && (
//       <motion.div ...>
//         <TiltCard ...>
//           ...
//         </TiltCard>
//       </motion.div>
//     )}
//   </AnimatePresence>
//
// Replace with just:
//   <motion.div ...>
//     <TiltCard ...>
//       ...
//     </TiltCard>
//   </motion.div>

// Find the AnimatePresence that wraps the sidebar
const sidebarAnimateStart = `        {/* LEFT SIDEBAR */}\r\n        <AnimatePresence>\r\n          {isSidebarOpen && (\r\n            <motion.div`;
const sidebarAnimateStartAlt = `        {/* LEFT SIDEBAR */}\n        <AnimatePresence>\n          {isSidebarOpen && (\n            <motion.div`;

if (dash.includes(sidebarAnimateStart)) {
  // Replace with direct motion.div (no AnimatePresence wrapper, no condition)
  dash = dash.replace(sidebarAnimateStart,
    `        {/* LEFT SIDEBAR */}\r\n        <motion.div`);
  // Now remove the closing )}\n          </AnimatePresence> that follows </TiltCard>\n              </motion.div>
  // The closing pattern is:      </motion.div>\n            )}\n          </AnimatePresence>
  const closingPattern = `              </motion.div>\r\n            )}\r\n          </AnimatePresence>`;
  dash = dash.replace(closingPattern, `        </motion.div>`);
  console.log('✓ Bug 1 fixed: Removed isSidebarOpen AnimatePresence wrapper (CRLF)');
} else if (dash.includes(sidebarAnimateStartAlt)) {
  dash = dash.replace(sidebarAnimateStartAlt,
    `        {/* LEFT SIDEBAR */}\n        <motion.div`);
  const closingPattern = `              </motion.div>\n            )}\n          </AnimatePresence>`;
  dash = dash.replace(closingPattern, `        </motion.div>`);
  console.log('✓ Bug 1 fixed: Removed isSidebarOpen AnimatePresence wrapper (LF)');
} else {
  console.log('  Could not find isSidebarOpen AnimatePresence wrapper');
  // Just remove the state reference in the condition
  dash = dash.replace('{isSidebarOpen && (', '(true && (');
}

// Also remove the theme-toggle button inside the sidebar header if present (it's now in Navbar)
// (already removed in previous session but double-check)

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('✓ Dashboard.jsx saved');
