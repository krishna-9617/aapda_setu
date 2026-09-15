/**
 * Fix 6: Inject MeshBackground into all non-landing, non-dashboard pages.
 * Replaces simple bg glow divs with the shared animated mesh component.
 */
const fs = require('fs');

const pages = [
  {
    file: 'src/pages/PlanHealthPage.jsx',
    variant: 'violet',
    removePattern: null, // PlanHealth uses inline glow inside left panel already — just add the background
  },
  {
    file: 'src/pages/WhatIfPage.jsx',
    variant: 'indigo',
    removePattern: null,
  },
  {
    file: 'src/pages/FieldReportPage.jsx',
    variant: 'orange',
    // FieldReportPage already has two background glow divs
    removePattern: `      {/* Background glows */}
      <div className="absolute top-[5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-orange-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />`,
  },
  {
    file: 'src/pages/AuditLogPage.jsx',
    variant: 'cyan',
    // AuditLogPage has one bg glow div
    removePattern: `      {/* Background Glow */}
      <div className="absolute top-[30%] left-[20%] w-[60%] h-[40%] rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none" />`,
  },
];

pages.forEach(({ file, variant, removePattern }) => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Add MeshBackground import if not present
  if (!code.includes('MeshBackground')) {
    // Insert after the last import
    const lastImportIdx = code.lastIndexOf('\nimport ');
    const afterImport = code.indexOf('\n', lastImportIdx + 1);
    code = code.slice(0, afterImport + 1)
      + `import MeshBackground from '../components/MeshBackground';\n`
      + code.slice(afterImport + 1);
    console.log(`  ✓ Added MeshBackground import to ${file}`);
  }
  
  // Remove old glow div(s) if pattern given
  if (removePattern && code.includes(removePattern)) {
    code = code.replace(removePattern, '');
    console.log(`  ✓ Removed old glow divs from ${file}`);
  }
  
  // Insert <MeshBackground variant="..." /> as first child of the motion.div root
  // Find the motion.div root return and insert right after its opening
  const motionDivReturn = `      transition={{ duration: 0.25 }}\n      className=`;
  if (code.includes(motionDivReturn)) {
    // Find the > that closes the motion.div opening tag
    const motionStart = code.indexOf(motionDivReturn);
    const closeTag = code.indexOf('>', motionStart);
    const nextNewline = code.indexOf('\n', closeTag);
    code = code.slice(0, nextNewline + 1)
      + `      <MeshBackground variant="${variant}" />\n`
      + code.slice(nextNewline + 1);
    console.log(`  ✓ Injected <MeshBackground variant="${variant}" /> into ${file}`);
  } else {
    console.log(`  ⚠ Could not find motion.div return in ${file}`);
  }
  
  fs.writeFileSync(file, code);
});

console.log('✓ Fix 6: MeshBackground injected into all pages');
