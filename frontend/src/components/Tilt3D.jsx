import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Reusable mouse-tracked 3D-tilt wrapper: real perspective/rotateX/rotateY
 * depth on hover, springed back to flat on leave. One implementation shared
 * across every card that gets this treatment (Solver Status badge, Priority
 * Queue items, habitation/site cards, audit timeline entries) rather than a
 * bespoke tilt handler rewritten in each place - the same reasoning as the
 * hero mesh and the landing capability cards: consistent depth, one thing to
 * get right instead of several.
 *
 * `strength` controls the maximum tilt in degrees. Kept modest (default 6)
 * everywhere it's used on data cards - a serious operations tool needs its
 * numbers to stay legible through the effect, not a showcase-site wobble.
 */
export default function Tilt3D({ children, strength = 6, className, style, as: Component = 'div' }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 22 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * strength);
    rotateX.set(py * -strength);
  };
  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ perspective: 800 }}
    >
      {/* The caller's `style` lands HERE, on the element that actually holds
          the children - not on the outer perspective wrapper above. A layout
          style like `display: grid` only lays out its own direct children;
          putting it on the outer div (whose only child is this motion.div)
          would silently strand the real content one level too deep to be
          affected by it, exactly the bug this comment is here to prevent
          reintroducing. */}
      <motion.div
        style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: 'preserve-3d', height: '100%', ...style }}
      >
        {children}
      </motion.div>
    </Component>
  );
}
