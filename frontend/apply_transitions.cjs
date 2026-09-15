/**
 * Part 2+3: Add page transition motion wrappers to PlanHealthPage, WhatIfPage, AuditLogPage
 * Part 4: Add layoutId="live-map" to map containers
 * Part 5: Create FieldReportPage
 */
const fs = require('fs');
const path = require('path');

// ─── Fix PlanHealthPage: add motion.div page wrapper + layoutId on map ─────
let ph = fs.readFileSync('src/pages/PlanHealthPage.jsx', 'utf-8');

// Add motion wrapper around the root div
ph = ph.replace(
  `  if (!healthData) return (
    <div className="min-h-screen p-8 pt-28 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );`,
  `  if (!healthData) return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen p-8 pt-28 flex items-center justify-center"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </motion.div>
  );`
);

// Wrap root return div in motion.div for page transitions
ph = ph.replace(
  `  return (
    <div className="min-h-screen pt-28 relative overflow-hidden">`,
  `  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >`
);
// Close the motion.div
ph = ph.replace(/(\s+)<\/div>\s*\);\s*\};\s*\nexport default PlanHealthPage;/, 
  `    </motion.div>
  );
};

export default PlanHealthPage;`
);

// Add layoutId to the map wrapper div in PlanHealthPage
ph = ph.replace(
  `        {/* RIGHT PANEL: Live Map */}
        <div className="lg:w-[55%] w-full relative border-l border-white/10">`,
  `        {/* RIGHT PANEL: Live Map */}
        <motion.div layoutId="live-map" className="lg:w-[55%] w-full relative border-l border-white/10">`
);
ph = ph.replace(
  `          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PlanHealthPage;`,
  `          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PlanHealthPage;`
);

fs.writeFileSync('src/pages/PlanHealthPage.jsx', ph);
console.log('PlanHealthPage.jsx updated');

// ─── Fix WhatIfPage: add motion.div page wrapper + layoutId on map ─────────
let wi = fs.readFileSync('src/pages/WhatIfPage.jsx', 'utf-8');

wi = wi.replace(
  `  return (
    <div className="min-h-screen pt-28 relative overflow-hidden">`,
  `  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen pt-28 relative overflow-hidden"
    >`
);
wi = wi.replace(
  /(\s+)<\/div>\s*\);\s*\};\s*\nexport default WhatIfPage;/,
  `    </motion.div>
  );
};

export default WhatIfPage;`
);

// Add layoutId to the map wrapper div in WhatIfPage
wi = wi.replace(
  `        {/* RIGHT PANEL: Map Preview */}
        <div className="lg:w-[60%] w-full relative border-l border-white/10">`,
  `        {/* RIGHT PANEL: Map Preview */}
        <motion.div layoutId="live-map" className="lg:w-[60%] w-full relative border-l border-white/10">`
);
wi = wi.replace(
  `          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WhatIfPage;`,
  `          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WhatIfPage;`
);

fs.writeFileSync('src/pages/WhatIfPage.jsx', wi);
console.log('WhatIfPage.jsx updated');

// ─── Fix AuditLogPage: add theme prop + page transition wrapper ─────────────
let al = fs.readFileSync('src/pages/AuditLogPage.jsx', 'utf-8');

// Add theme to component signature
al = al.replace(
  'const AuditLogPage = () => {',
  'const AuditLogPage = ({ theme }) => {'
);

// Wrap root div in motion.div
al = al.replace(
  `  return (
    <div className="min-h-screen p-8 pt-28 pb-20 relative overflow-hidden">`,
  `  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen p-8 pt-28 pb-20 relative overflow-hidden"
    >`
);
al = al.replace(
  /\s+<\/div>\s*\);\s*\};\s*\nexport default AuditLogPage;/,
  `
    </motion.div>
  );
};

export default AuditLogPage;`
);

fs.writeFileSync('src/pages/AuditLogPage.jsx', al);
console.log('AuditLogPage.jsx updated');

// ─── Fix LandingPage: add page transition wrapper ─────────────────────────
let lp = fs.readFileSync('src/pages/LandingPage.jsx', 'utf-8');
lp = lp.replace(
  `  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#F8FAFC',
      fontFamily: 'Lexend, sans-serif',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>`,
  `  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        color: '#F8FAFC',
        fontFamily: 'Lexend, sans-serif',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >`
);
lp = lp.replace(
  '    </div>\n  );\n};\n\nexport default LandingPage;',
  '    </motion.div>\n  );\n};\n\nexport default LandingPage;'
);
fs.writeFileSync('src/pages/LandingPage.jsx', lp);
console.log('LandingPage.jsx updated');

console.log('\n✅ All page wrappers done. Parts 2+3+4 applied.');
