import os

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"✓ Patched {file_path}")
        else:
            print(f"⚠ Failed to find string in {file_path}:\n{old[:50]}...")
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# ── PlanHealthPage ──
patch('src/pages/PlanHealthPage.jsx', [
    (
        'import { ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2, GripVertical } from "lucide-react";',
        'import { ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2, GripVertical } from "lucide-react";\nimport { MagicCard } from "@/components/ui/magic-card";\nimport MeshBackground from "../components/MeshBackground";\nimport ApprovalModal from "../components/ApprovalModal";'
    ),
    (
        'const [justApplied, setJustApplied] = useState(null);',
        'const [justApplied, setJustApplied] = useState(null);\n  const [pendingResult, setPendingResult] = useState(null);'
    ),
    (
        '''  const handleApply = async (intervention) => {
    setLoading(true);
    setJustApplied(intervention.id);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/apply-intervention`, {
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
  };''',
        '''  const handleApply = async (intervention) => {
    setLoading(true);
    setJustApplied(intervention.id);
    try {
      const res = await fetch(`${API_BASE_URL}/plans/apply-intervention`, {
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
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/approve`, { method: 'POST' });
      setPendingResult(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPlan = async () => {
    if (!pendingResult) return;
    try {
      await fetch(`${API_BASE_URL}/plans/${pendingResult.plan.plan_id}/reject`, { method: 'POST' });
      setPendingResult(null);
    } catch (e) {
      console.error(e);
    }
  };'''
    ),
    (
        '''      className="min-h-screen pt-28 relative overflow-hidden"
    >''',
        '''      className="min-h-screen pt-28 relative overflow-hidden"
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
      </AnimatePresence>'''
    ),
    (
        '''                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.08 }}
                        className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>''',
        '''                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.08 }}
                        className="rounded-xl overflow-hidden"
                      >
                        <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10 hover:bg-white/[0.05] transition-colors">
                        <div className="relative z-10">
                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>'''
    ),
    (
        '''                          <button
                            onClick={() => handleApply(inv)}
                            disabled={loading || justApplied === inv.id}''',
        '''                          <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}
                            onClick={() => handleApply(inv)}
                            disabled={loading || justApplied === inv.id}'''
    ),
    (
        '''Applying..." : "Apply Intervention"}
                          </button>
                        </div>
                      </motion.div>''',
        '''Applying..." : "Apply Intervention"}
                          </motion.button>
                        </div>
                        </div>
                        </MagicCard>
                      </motion.div>'''
    )
])
