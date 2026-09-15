const fs = require('fs');

function robustPatch(filePath, patches) {
  let code = fs.readFileSync(filePath, 'utf8');
  for (let { search, replace, log } of patches) {
    if (code.includes(search)) {
      code = code.replace(search, replace);
      console.log(`✓ [${filePath}] ${log}`);
    } else {
      console.log(`⚠ [${filePath}] Failed to find: ${search.substring(0, 50)}...`);
    }
  }
  fs.writeFileSync(filePath, code);
}

// ── 1. PlanHealthPage: Add ApprovalModal & MagicCard & AuroraBackground & Smooth Drag ──
robustPatch('src/pages/PlanHealthPage.jsx', [
  // Imports
  {
    search: `import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Activity } from "lucide-react";`,
    replace: `import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Activity } from "lucide-react";\nimport { MagicCard } from "@/components/ui/magic-card";\nimport MeshBackground from '../components/MeshBackground';\nimport ApprovalModal from '../components/ApprovalModal';`,
    log: 'Added imports'
  },
  {
    search: `  const [isDragging, setIsDragging] = useState(false);`,
    replace: `  const isDragging = useRef(false);\n  const liveLeftPct = useRef(40);\n  const leftPanelRef = useRef(null);`,
    log: 'Switched to ref-based drag state'
  },
  {
    search: `  const [justApplied, setJustApplied] = useState(null);`,
    replace: `  const [justApplied, setJustApplied] = useState(null);\n  const [pendingResult, setPendingResult] = useState(null);`,
    log: 'Added pendingResult state'
  },
  {
    search: `  const startDrag = () => {
    setIsDragging(true);
    document.body.style.userSelect = 'none';
  };

  const stopDrag = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  };

  const onMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(30, Math.min(60, (x / rect.width) * 100));
    setLeftPct(pct);
  }, [isDragging]);`,
    replace: `  const startDrag = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setLeftPct(liveLeftPct.current);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current || !leftPanelRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(30, Math.min(60, ((e.clientX - rect.left) / rect.width) * 100));
    liveLeftPct.current = pct;
    leftPanelRef.current.style.width = pct + '%';
  }, []);`,
    log: 'Updated smooth drag functions'
  },
  {
    search: `    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove]);`,
    replace: `    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);`,
    log: 'Updated event listeners'
  },
  {
    search: `  const handleApply = async (intervention) => {
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
  };`,
    replace: `  const handleApply = async (intervention) => {
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
  };`,
    log: 'Updated handleApply and modal handlers'
  },
  {
    search: `      className="min-h-screen pt-28 relative overflow-hidden"
    >`,
    replace: `      className="min-h-screen pt-28 relative overflow-hidden"
    >
      <MeshBackground />
      <AnimatePresence>
        {pendingResult && (
          <ApprovalModal
            pendingPlanData={pendingResult}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}
      </AnimatePresence>`,
    log: 'Injected MeshBackground and ApprovalModal into render'
  },
  {
    search: `        <div
          style={{ width: \`\${leftPct}%\` }}
          className="overflow-y-auto shrink-0 p-6 lg:p-8"
        >`,
    replace: `        <div
          ref={leftPanelRef}
          style={{ width: \`\${leftPct}%\` }}
          className="overflow-y-auto shrink-0 p-6 lg:p-8"
        >`,
    log: 'Added leftPanelRef'
  },
  {
    search: `                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.08 }}
                        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>`,
    replace: `                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl overflow-hidden"
                      >
                        <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10 hover:bg-white/[0.05] transition-colors">
                        <div className="relative z-10">
                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>`,
    log: 'Wrapped interventions in MagicCard'
  },
  {
    search: `                          <button
                            onClick={() => handleApply(inv)}
                            disabled={loading || justApplied === inv.id}`,
    replace: `                          <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}
                            onClick={() => handleApply(inv)}
                            disabled={loading || justApplied === inv.id}`,
    log: 'Added hover to apply button'
  },
  {
    search: `Applying..." : "Apply Intervention"}
                          </button>`,
    replace: `Applying..." : "Apply Intervention"}
                          </motion.button>
                        </div>
                        </MagicCard>`,
    log: 'Closed MagicCard and motion.button'
  }
]);
