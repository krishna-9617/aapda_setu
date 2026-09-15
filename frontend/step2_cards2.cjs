const fs = require('fs');

// ── Field Report ──
let fr = fs.readFileSync('src/pages/FieldReportPage.jsx', 'utf8');
if (!fr.includes('MagicCard')) {
  fr = fr.replace(
    `import { AlertTriangle, Radio, CheckCircle2, Zap, Droplets, Building2, RefreshCw, GripVertical } from "lucide-react";`,
    `import { AlertTriangle, Radio, CheckCircle2, Zap, Droplets, Building2, RefreshCw, GripVertical } from "lucide-react";\nimport { MagicCard } from "@/components/ui/magic-card";`
  );
  
  // Replace section wrappers
  fr = fr.replace(
    /className="p-5 rounded-xl bg-white\/\[0\.03\] border border-white\/10 backdrop-blur-sm space-y-3"/g,
    `className="rounded-xl overflow-hidden"`
  );
  
  fr = fr.replace(
    /<h3 className="text-sm font-semibold text-white flex items-center gap-2">/g,
    `<MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10">\n        <div className="relative z-10 space-y-3">\n        <h3 className="text-sm font-semibold text-white flex items-center gap-2">`
  );
  
  fr = fr.replace(
    /<\/button>\n      <\/div>/g,
    `</motion.button>\n        </div>\n        </MagicCard>\n      </div>`
  );
  
  // Add whileHover to primary buttons
  fr = fr.replace(
    /<button onClick=\{handleBaseline\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(16,185,129,0.5)' }} onClick={handleBaseline}`
  );
  fr = fr.replace(
    /<button onClick=\{handleBridgeCollapse\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(239,68,68,0.5)' }} onClick={handleBridgeCollapse}`
  );
  fr = fr.replace(
    /<button onClick=\{handleCapacityDrop\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(249,115,22,0.5)' }} onClick={handleCapacityDrop}`
  );
  
  fs.writeFileSync('src/pages/FieldReportPage.jsx', fr);
  console.log('✓ Added MagicCard and button hover to FieldReportPage');
}

// ── WhatIfPage ──
let wi = fs.readFileSync('src/pages/WhatIfPage.jsx', 'utf8');
if (!wi.includes('MagicCard')) {
  wi = wi.replace(
    `import { AlertTriangle, Plus, Shuffle, Map, Zap, RefreshCw, GripVertical } from "lucide-react";`,
    `import { AlertTriangle, Plus, Shuffle, Map, Zap, RefreshCw, GripVertical } from "lucide-react";\nimport { MagicCard } from "@/components/ui/magic-card";`
  );
  
  // Replace section wrappers
  wi = wi.replace(
    /className="p-5 rounded-xl bg-white\/\[0\.03\] border border-white\/10 backdrop-blur-sm space-y-3 relative overflow-hidden"/g,
    `className="rounded-xl overflow-hidden"`
  );
  
  wi = wi.replace(
    /<h3 className="text-sm font-semibold text-white flex items-center gap-2">/g,
    `<MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10">\n        <div className="relative z-10 space-y-3">\n        <h3 className="text-sm font-semibold text-white flex items-center gap-2">`
  );
  
  wi = wi.replace(
    /<\/button>\n      <\/div>/g,
    `</motion.button>\n        </div>\n        </MagicCard>\n      </div>`
  );
  
  // Add whileHover to primary buttons
  wi = wi.replace(
    /<button onClick=\{handleBaseline\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(16,185,129,0.5)' }} onClick={handleBaseline}`
  );
  wi = wi.replace(
    /<button onClick=\{handleAddSite\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(56,189,248,0.5)' }} onClick={handleAddSite}`
  );
  wi = wi.replace(
    /<button onClick=\{handleScramble\}/g,
    `<motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(139,92,246,0.5)' }} onClick={handleScramble}`
  );
  
  fs.writeFileSync('src/pages/WhatIfPage.jsx', wi);
  console.log('✓ Added MagicCard and button hover to WhatIfPage');
}
