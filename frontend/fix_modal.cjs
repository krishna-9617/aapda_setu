const fs = require('fs');

let code = fs.readFileSync('src/pages/PlanHealthPage.jsx', 'utf8');

// 1. Add missing imports
if (!code.includes('ApprovalModal')) {
  code = `import ApprovalModal from '../components/ApprovalModal';\n` + code;
}

// 2. Add pendingResult state
if (!code.includes('const [pendingResult, setPendingResult]')) {
  code = code.replace(
    'const [justApplied, setJustApplied] = useState(null);',
    'const [justApplied, setJustApplied] = useState(null);\n  const [pendingResult, setPendingResult] = useState(null);'
  );
}

// 3. Rewrite handleApply to capture result
const OLD_HANDLE_APPLY = `  const handleApply = async (intervention) => {
    setLoading(true);
    setJustApplied(intervention.id);
    try {
      const res = await fetch(\`\${API_BASE_URL}/plans/apply-intervention\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: intervention.type,
          site_id: intervention.site_id,
          resource_type: intervention.resource_type,
          amount: intervention.amount,
          habitation_id: intervention.habitation_id
        })
      });
      if (!res.ok) throw new Error("Failed to apply intervention");
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => setJustApplied(null), 3000);
  };`;

const NEW_HANDLE_APPLY = `  const handleApply = async (intervention) => {
    setLoading(true);
    setJustApplied(intervention.id);
    try {
      const res = await fetch(\`\${API_BASE_URL}/plans/apply-intervention\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: intervention.type,
          site_id: intervention.site_id,
          resource_type: intervention.resource_type,
          amount: intervention.amount,
          habitation_id: intervention.habitation_id
        })
      });
      if (!res.ok) throw new Error("Failed to apply intervention");
      const result = await res.json();
      if (result?.plan) {
        setPendingResult(result);
      } else {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setTimeout(() => setJustApplied(null), 3000);
  };

  const handleApprovePlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/approve\`, { method: 'POST' });
      setPendingResult(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(\`\${API_BASE_URL}/plans/\${pendingResult.plan.plan_id}/reject\`, { method: 'POST' });
      setPendingResult(null);
    } catch (e) {
      console.error(e);
    }
  };`;

if (code.includes(OLD_HANDLE_APPLY)) {
  code = code.replace(OLD_HANDLE_APPLY, NEW_HANDLE_APPLY);
} else {
  console.log("Could not find OLD_HANDLE_APPLY block in PlanHealthPage.jsx");
}

// 4. Inject ApprovalModal inside the main render block
const INJECT_MARKER = `      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground variant="violet" />`;

const INJECT_CONTENT = `      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground variant="violet" />

      {/* Approval Modal */}
      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>`;

if (code.includes(INJECT_MARKER)) {
  code = code.replace(INJECT_MARKER, INJECT_CONTENT);
} else {
  console.log("Could not find INJECT_MARKER in PlanHealthPage.jsx");
}

fs.writeFileSync('src/pages/PlanHealthPage.jsx', code);
console.log("✓ Fix 1 applied to PlanHealthPage.jsx");
