import React from 'react';
import { AuroraBackground } from './ui/aurora-background';

const MeshBackground = () => {
  return (
    <div className="fixed inset-0 z-[-10] pointer-events-none">
      <AuroraBackground className="!h-[100vh] !w-[100vw] !absolute !inset-0" showRadialGradient={true}>
        {/* Rendered as an empty background layer behind the main scrollable content */}
      </AuroraBackground>
    </div>
  );
};

export default MeshBackground;
