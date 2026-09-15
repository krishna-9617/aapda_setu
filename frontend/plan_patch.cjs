const fs = require('fs');
let c = fs.readFileSync('src/pages/PlanHealthPage.jsx', 'utf-8');

// Imports
if (!c.includes('MagicCard')) {
    c = c.replace(/import \{ Badge \} from "@\/components\/ui\/badge";/, "import { Badge } from \"@/components/ui/badge\";\nimport { MagicCard } from \"@/components/ui/magic-card\";\nimport { PulsatingButton } from \"@/components/ui/pulsating-button\";");
}

// Replace the indicator
const oldIndicator = `{isHealthy ? (
              <motion.div 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                <ShieldCheck size={48} className="text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <ShieldAlert size={48} className="text-red-400" />
              </motion.div>
            )}`;

const newIndicator = `{isHealthy ? (
              <PulsatingButton pulseColor="rgba(16,185,129,0.3)" className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center pointer-events-none hover:bg-emerald-500/10">
                <ShieldCheck size={48} className="text-emerald-400" />
              </PulsatingButton>
            ) : (
              <PulsatingButton pulseColor="rgba(239,68,68,0.4)" duration="1s" className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center pointer-events-none hover:bg-red-500/10">
                <ShieldAlert size={48} className="text-red-400" />
              </PulsatingButton>
            )}`;

if (c.includes('ShieldCheck size={48}')) {
    // Regex replace because string might have indentation variations
    c = c.replace(/\{isHealthy \? \([\s\S]*?<ShieldCheck size=\{48\}[\s\S]*?<\/motion\.div>\s*\) : \([\s\S]*?<ShieldAlert size=\{48\}[\s\S]*?<\/motion\.div>\s*\)\}/, newIndicator);
}

// Replace Card with MagicCard
const oldCard = `<Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm flex flex-col h-full hover:border-white/10 transition-colors">`;
const newCard = `<MagicCard className="bg-slate-900/50 flex flex-col h-full border-white/5 shadow-2xl" gradientColor="rgba(255,255,255,0.08)">`;
c = c.replace(new RegExp(oldCard.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'), 'g'), newCard);

c = c.replace(/<\/Card>/g, '</MagicCard>');

// Check if Card is still imported but not used, not a big deal.

// "framer-motion: satisfying animation when an intervention is applied and status improves"
// Add a success overlay when justApplied is true.
const overlay = `
      {justApplied && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="flex flex-col items-center p-8 bg-emerald-950/80 border border-emerald-500/30 rounded-3xl"
          >
            <CheckCircle2 size={80} className="text-emerald-400 mb-4" />
            <h2 className="text-2xl font-bold text-emerald-100">Intervention Applied!</h2>
            <p className="text-emerald-300/80 mt-2">Re-optimizing plan constraints...</p>
          </motion.div>
        </motion.div>
      )}
`;

if (!c.includes('Intervention Applied!')) {
    c = c.replace(/<div className="absolute top-\[-20%\] left-\[-10%\]/, overlay + '\n        <div className="absolute top-[-20%] left-[-10%]');
}

fs.writeFileSync('src/pages/PlanHealthPage.jsx', c);
console.log('PlanHealth patched!');
