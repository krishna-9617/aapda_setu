const fs = require('fs');

// ── Audit Log ──
let audit = fs.readFileSync('src/pages/AuditLogPage.jsx', 'utf8');
if (!audit.includes('MagicCard')) {
  audit = audit.replace(
    `import { ShimmerButton } from "@/components/ui/shimmer-button";`,
    `import { ShimmerButton } from "@/components/ui/shimmer-button";\nimport { MagicCard } from "@/components/ui/magic-card";`
  );
  
  audit = audit.replace(
    `className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"`,
    `className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"`
  );
  
  audit = audit.replace(
    `<motion.div \n          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}\n          className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"\n        >\n          <div className="overflow-x-auto">`,
    `<motion.div \n          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}\n          className="rounded-2xl overflow-hidden shadow-2xl"\n        >\n          <MagicCard gradientColor="rgba(255,255,255,0.08)" className="border-white/10 bg-white/[0.02]">\n          <div className="overflow-x-auto relative z-10">`
  );
  
  audit = audit.replace(
    `          </div>\n        </motion.div>`,
    `          </div>\n          </MagicCard>\n        </motion.div>`
  );
  
  fs.writeFileSync('src/pages/AuditLogPage.jsx', audit);
  console.log('✓ Added MagicCard to AuditLogPage');
}

// ── Plan Health Interventions ──
let ph = fs.readFileSync('src/pages/PlanHealthPage.jsx', 'utf8');
if (!ph.includes('MagicCard')) {
  ph = ph.replace(
    `import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Activity } from "lucide-react";`,
    `import { AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Activity } from "lucide-react";\nimport { MagicCard } from "@/components/ui/magic-card";`
  );
  
  ph = ph.replace(
    `className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] transition-colors"`,
    `className="rounded-xl overflow-hidden"`
  );
  
  ph = ph.replace(
    `                      <motion.div\n                        key={inv.id}\n                        initial={{ opacity: 0, y: 20 }}\n                        animate={{ opacity: 1, y: 0 }}\n                        exit={{ opacity: 0, scale: 0.95 }}\n                        transition={{ delay: idx * 0.08 }}\n                        className="rounded-xl overflow-hidden"\n                      >\n                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>`,
    `                      <motion.div\n                        key={inv.id}\n                        initial={{ opacity: 0, y: 20 }}\n                        animate={{ opacity: 1, y: 0 }}\n                        exit={{ opacity: 0, scale: 0.95 }}\n                        transition={{ delay: idx * 0.08 }}\n                        className="rounded-xl overflow-hidden"\n                      >\n                        <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10">\n                        <div className="relative z-10">\n                        <h3 className="text-base font-semibold text-white mb-1">{inv.title}</h3>`
  );
  
  ph = ph.replace(
    `Applying..." : "Apply Intervention"}\n                          </button>\n                        </div>\n                      </motion.div>`,
    `Applying..." : "Apply Intervention"}\n                          </motion.button>\n                        </div>\n                        </div>\n                        </MagicCard>\n                      </motion.div>`
  );
  
  // Also add whileHover scale to Apply button
  ph = ph.replace(
    `<button\n                            onClick={() => handleApply(inv)}`,
    `<motion.button\n                            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}\n                            onClick={() => handleApply(inv)}`
  );
  
  fs.writeFileSync('src/pages/PlanHealthPage.jsx', ph);
  console.log('✓ Added MagicCard and button hover to PlanHealthPage');
}
