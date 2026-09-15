const fs = require('fs');

const staggerVars = `
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };
`;

// ── Field Report Stagger ──
let fr = fs.readFileSync('src/pages/FieldReportPage.jsx', 'utf8');
if (!fr.includes('staggerContainer')) {
  fr = fr.replace(
    `  const selectCls`,
    staggerVars + `  const selectCls`
  );
  fr = fr.replace(
    `<div className="space-y-5">`,
    `<motion.div className="space-y-5" variants={staggerContainer} initial="hidden" animate="show">`
  );
  fr = fr.replace(
    /<\/div>\n  \);/g,
    `</motion.div>\n  );`
  );
  // Add variants={staggerItem} to each card
  fr = fr.replace(
    /<div className="rounded-xl overflow-hidden">/g,
    `<motion.div variants={staggerItem} className="rounded-xl overflow-hidden">`
  );
  fr = fr.replace(
    /<\/MagicCard>\n      <\/div>/g,
    `</MagicCard>\n      </motion.div>`
  );
  // Also header
  fr = fr.replace(
    `      {/* Header */}\n      <div>`,
    `      {/* Header */}\n      <motion.div variants={staggerItem}>`
  );
  fr = fr.replace(
    `optimization with human approval.\n        </p>\n      </div>`,
    `optimization with human approval.\n        </p>\n      </motion.div>`
  );
  fs.writeFileSync('src/pages/FieldReportPage.jsx', fr);
  console.log('✓ Added stagger to FieldReportPage');
}

// ── WhatIf Stagger ──
let wi = fs.readFileSync('src/pages/WhatIfPage.jsx', 'utf8');
if (!wi.includes('staggerContainer')) {
  wi = wi.replace(
    `  const [rightPct, setRightPct] = useState(60);`,
    `  const [rightPct, setRightPct] = useState(60);\n` + staggerVars
  );
  wi = wi.replace(
    `<div className="space-y-5">`,
    `<motion.div className="space-y-5" variants={staggerContainer} initial="hidden" animate="show">`
  );
  wi = wi.replace(
    /<\/div>\n  \);/g,
    `</motion.div>\n  );`
  );
  // Add variants={staggerItem} to each card
  wi = wi.replace(
    /<div className="rounded-xl overflow-hidden">/g,
    `<motion.div variants={staggerItem} className="rounded-xl overflow-hidden">`
  );
  wi = wi.replace(
    /<\/MagicCard>\n      <\/div>/g,
    `</MagicCard>\n      </motion.div>`
  );
  // Also header
  wi = wi.replace(
    `      {/* Header */}\n      <div>`,
    `      {/* Header */}\n      <motion.div variants={staggerItem}>`
  );
  wi = wi.replace(
    `what-if scenarios before applying them.\n        </p>\n      </div>`,
    `what-if scenarios before applying them.\n        </p>\n      </motion.div>`
  );
  fs.writeFileSync('src/pages/WhatIfPage.jsx', wi);
  console.log('✓ Added stagger to WhatIfPage');
}
