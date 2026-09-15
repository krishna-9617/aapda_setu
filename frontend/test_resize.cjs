/**
 * Add resizable split panel to PlanHealthPage and WhatIfPage via a draggable divider
 */
const fs = require('fs');

// ─── PlanHealthPage ──────────────────────────────────────────────────────────
let ph = fs.readFileSync('src/pages/PlanHealthPage.jsx', 'utf-8');

// Add useRef and useState for resizing
ph = ph.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect, useRef, useCallback } from "react";'
);

// Add resize state after existing state declarations
ph = ph.replace(
  '  const [justApplied, setJustApplied] = useState(null);',
  `  const [justApplied, setJustApplied] = useState(null);
  const [leftPct, setLeftPct] = useState(45);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const startDrag = useCallback(() => {
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
    setLeftPct(pct);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);`
);

// Replace the split layout div to use the resize logic
ph = ph.replace(
  `      {/* Split layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)]">
        {/* LEFT PANEL: Status + Interventions */}
        <div className="lg:w-[45%] w-full overflow-y-auto p-6 lg:p-8">`,
  `      {/* Split layout */}
      <div ref={containerRef} className="flex flex-col lg:flex-row h-[calc(100vh-7rem)]">
        {/* LEFT PANEL: Status + Interventions */}
        <div style={{ width: \`\${leftPct}%\` }} className="hidden lg:block overflow-y-auto p-6 lg:p-8">
        </div>
        {/* FALLBACK for mobile */}
        <div className="lg:hidden w-full overflow-y-auto p-6">`
);

// This approach won't work cleanly with string replace on complex JSX - let me use a different approach
// Instead just add the divider between the two panels

console.log('Resizable panel changes are complex - handling differently');
