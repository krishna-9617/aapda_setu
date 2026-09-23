import React from 'react';
import { AuroraBackground } from './ui/aurora-background';

/*
 * The single ambient background layer, used by every page.
 *
 * Before this was shared, each page brought its own: the landing page had an
 * aurora, Plan Health and Field Report had this component (Field Report stacked
 * it twice), What-If had nothing at all, and the Audit Log had a one-off cyan
 * glow. That is the kind of drift that makes an app feel assembled rather than
 * designed, so all of them now render this.
 *
 * `variant` tints the drifting orbs so a page can carry its own accent - amber
 * for field reporting, rose for hazard - without changing the underlying
 * treatment. It used to be accepted and silently ignored; it works now.
 */

const VARIANT_TINTS = {
  default: null,                        // inherits the indigo/cyan tokens
  orange: 'rgba(251, 146, 60, 0.22)',
  rose: 'rgba(244, 63, 94, 0.20)',
  emerald: 'rgba(52, 211, 153, 0.20)',
  violet: 'rgba(167, 139, 250, 0.20)',
};

const MeshBackground = ({ variant = 'default', aurora = true }) => {
  const tint = VARIANT_TINTS[variant] ?? VARIANT_TINTS.default;

  return (
    <div className="fixed inset-0 z-[-10] pointer-events-none" aria-hidden="true">
      {aurora && (
        <AuroraBackground
          className="!h-[100vh] !w-[100vw] !absolute !inset-0"
          showRadialGradient={true}
        >
          {/* Empty: this is a background layer, not a container. */}
        </AuroraBackground>
      )}
      <div
        className="as-ambient"
        style={tint ? { '--as-accent-glow': tint } : undefined}
      />
    </div>
  );
};

export default MeshBackground;
