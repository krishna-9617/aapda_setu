import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * A genuine CSS-3D visual for the hero section: a small node graph (standing
 * in for the habitation/shelter assignment problem the product actually
 * solves) suspended in real 3D space via `perspective` + `translateZ`, that
 * tilts toward the cursor.
 *
 * Deliberately NOT WebGL/three.js. react-three-fiber's current stable release
 * requires React <19.3 and this project runs 19.3.0 - installing it forced a
 * peer-dependency conflict (`npm error ERESOLVE`), exactly the kind of
 * instability the brief says to avoid forcing through. CSS 3D transforms
 * (perspective, translateZ, preserve-3d) are a real three-dimensional
 * technique in their own right - the nodes genuinely sit at different depths
 * and move at different rates under the parallax below - it just doesn't
 * need a WebGL context, a render loop, or a new dependency to do it.
 */

// Nodes positioned as percentages of the container (x, y) plus a Z depth in
// pixels. Loosely mirrors the shape of an assignment problem: a few "site"
// nodes each drawing edges from several "habitation" nodes, not a uniform
// grid, so it reads as a graph rather than a decorative lattice.
const NODES = [
  { id: 'h1', x: 8, y: 22, z: 40, r: 4, kind: 'hab' },
  { id: 'h2', x: 4, y: 55, z: -30, r: 3.5, kind: 'hab' },
  { id: 'h3', x: 14, y: 82, z: 60, r: 4.5, kind: 'hab' },
  { id: 'h4', x: 90, y: 18, z: -20, r: 4, kind: 'hab' },
  { id: 'h5', x: 94, y: 68, z: 50, r: 3.5, kind: 'hab' },
  { id: 's1', x: 38, y: 12, z: 10, r: 6, kind: 'site' },
  { id: 's2', x: 62, y: 42, z: -50, r: 7, kind: 'site' },
  { id: 's3', x: 32, y: 78, z: 30, r: 6, kind: 'site' },
  { id: 's4', x: 74, y: 88, z: -10, r: 5.5, kind: 'site' },
];

const EDGES = [
  ['h1', 's1'], ['h2', 's1'], ['h2', 's2'], ['h3', 's3'],
  ['h4', 's1'], ['h4', 's2'], ['h5', 's2'], ['h5', 's4'], ['h3', 's4'],
];

function nodeById(id) {
  return NODES.find(n => n.id === id);
}

export default function NetworkMesh3D() {
  const containerRef = useRef(null);

  // Raw mouse offset from container centre, in -0.5..0.5, springed for a
  // smooth trailing follow rather than a snap-to-cursor jitter.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 18 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-14, 14]);

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        perspective: '1400px',
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY,
        }}
      >
        {/* Edges: thin rotated divs connecting each pair's 2D projection.
            Drawn first so nodes render on top of the lines that meet them. */}
        {EDGES.map(([fromId, toId], i) => {
          const from = nodeById(fromId);
          const to = nodeById(toId);
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const lengthPct = Math.hypot(dx, dy);
          const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
          const midZ = (from.z + to.z) / 2;

          return (
            <motion.div
              key={`${fromId}-${toId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ duration: 1.2, delay: 0.4 + i * 0.05 }}
              style={{
                position: 'absolute',
                left: `${from.x}%`,
                top: `${from.y}%`,
                width: `${lengthPct}%`,
                height: '1px',
                background: 'linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))',
                transformOrigin: '0 0',
                transform: `translateZ(${midZ}px) rotate(${angleDeg}deg)`,
              }}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: `translate3d(-50%, -50%, ${node.z}px)`,
            }}
          >
            <motion.div
              animate={{
                boxShadow: node.kind === 'site'
                  ? ['0 0 8px rgba(129,140,248,0.6)', '0 0 18px rgba(129,140,248,0.9)', '0 0 8px rgba(129,140,248,0.6)']
                  : ['0 0 6px rgba(56,189,248,0.5)', '0 0 14px rgba(56,189,248,0.8)', '0 0 6px rgba(56,189,248,0.5)'],
              }}
              transition={{ duration: 2.4 + (i % 3) * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: node.r * 2,
                height: node.r * 2,
                borderRadius: '50%',
                background: node.kind === 'site' ? '#818cf8' : '#38bdf8',
                border: '1px solid rgba(255,255,255,0.4)',
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
