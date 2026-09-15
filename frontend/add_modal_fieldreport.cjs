const fs = require('fs');
let code = fs.readFileSync('src/pages/FieldReportPage.jsx', 'utf-8');

if (!code.includes('ApprovalModal')) {
  code = `import ApprovalModal from '../components/ApprovalModal';\n` + code;
  
  // Find where to place the modal. Inside AnimatePresence for the modal overlay.
  // We can just add it before the {errorMsg && } Toast AnimatePresence.
  const modalPlacement = `
      {/* Approval Modal from Dashboard */}
      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal 
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>
  `;
  
  code = code.replace('{/* Toast messages */}', modalPlacement + '\n      {/* Toast messages */}');
  
  // Now implement handleApprovePlan and handleRejectPlan
  // Since FieldReportPage doesn't have these, we add them.
  // We need API_BASE_URL.
  const handlers = `
  const handleApprovePlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/approve\`, { method: 'POST' });
      setPendingResult(null);
      setSuccessMsg("Plan approved and applied successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to approve plan.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/reject\`, { method: 'POST' });
      setPendingResult(null);
      setErrorMsg("Plan rejected. Reverted to previous baseline.");
      setTimeout(() => setErrorMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };
  `;
  
  // Insert handlers inside the component before `const handleBaseline`
  code = code.replace('const handleBaseline = async () => {', handlers + '\n  const handleBaseline = async () => {');
  
  fs.writeFileSync('src/pages/FieldReportPage.jsx', code);
  console.log('Added ApprovalModal to FieldReportPage');
} else {
  console.log('Already added');
}
