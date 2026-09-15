/**
 * Fix 5: Apply smooth drag (DOM ref mutation) to WhatIfPage and PlanHealthPage
 * Replaces setState-on-every-mousemove with direct DOM style mutation during drag.
 */
const fs = require('fs');

function applySmootDrag(filepath, accentColor = 'violet') {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // Add leftPanelRef
  if (!code.includes('leftPanelRef')) {
    code = code.replace(
      `  const containerRef = useRef(null);\n  const isDragging = useRef(false);`,
      `  const containerRef = useRef(null);\n  const leftPanelRef = useRef(null);\n  const isDragging = useRef(false);\n  const liveLeftPct = useRef(40);`
    );
  }
  
  // Replace the onMouseMove to use direct DOM mutation
  const OLD_MOUSE_MOVE = `  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(75, (x / rect.width) * 100));
    setLeftPct(pct);
  }, []);`;
  
  const NEW_MOUSE_MOVE = `  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current || !leftPanelRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(20, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100));
    liveLeftPct.current = pct;
    leftPanelRef.current.style.width = pct + '%'; // direct DOM — zero re-renders
  }, []);`;
  
  if (code.includes(OLD_MOUSE_MOVE)) {
    code = code.replace(OLD_MOUSE_MOVE, NEW_MOUSE_MOVE);
    console.log(`  ✓ Patched onMouseMove in ${filepath}`);
  } else {
    console.log(`  ⚠ onMouseMove pattern not found in ${filepath}`);
  }
  
  // Replace stopDrag to commit leftPct on mouseup
  const OLD_STOP = `  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);`;
  
  const NEW_STOP = `  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setLeftPct(liveLeftPct.current); // single re-render on release
  }, []);`;
  
  if (code.includes(OLD_STOP)) {
    code = code.replace(OLD_STOP, NEW_STOP);
    console.log(`  ✓ Patched stopDrag in ${filepath}`);
  } else {
    console.log(`  ⚠ stopDrag pattern not found in ${filepath}`);
  }
  
  // Add ref={leftPanelRef} to the left panel div
  // WhatIfPage: <div\n          style={{ width: `${leftPct}%` }}\n          className="overflow-y-auto p-6 lg:p-8 shrink-0"
  const OLD_LEFT_DIV = `          style={{ width: \`\${leftPct}%\` }}\n          className="overflow-y-auto p-6 lg:p-8 shrink-0"`;
  const NEW_LEFT_DIV = `          ref={leftPanelRef}\n          style={{ width: \`\${leftPct}%\` }}\n          className="overflow-y-auto p-6 lg:p-8 shrink-0"`;
  
  if (code.includes(OLD_LEFT_DIV)) {
    code = code.replace(OLD_LEFT_DIV, NEW_LEFT_DIV);
    console.log(`  ✓ Added leftPanelRef to left div in ${filepath}`);
  } else {
    // Try PlanHealthPage variant
    const OLD_LEFT_DIV2 = `          style={{ width: \`\${leftPct}%\` }}\n          className="overflow-y-auto shrink-0 p-6 lg:p-8"`;
    const NEW_LEFT_DIV2 = `          ref={leftPanelRef}\n          style={{ width: \`\${leftPct}%\` }}\n          className="overflow-y-auto shrink-0 p-6 lg:p-8"`;
    if (code.includes(OLD_LEFT_DIV2)) {
      code = code.replace(OLD_LEFT_DIV2, NEW_LEFT_DIV2);
      console.log(`  ✓ Added leftPanelRef (variant) to left div in ${filepath}`);
    } else {
      console.log(`  ⚠ left panel div not found in ${filepath}`);
    }
  }
  
  fs.writeFileSync(filepath, code);
}

applySmootDrag('src/pages/WhatIfPage.jsx');
applySmootDrag('src/pages/PlanHealthPage.jsx');
console.log('✓ Fix 5: Smooth drag applied to WhatIfPage and PlanHealthPage');
