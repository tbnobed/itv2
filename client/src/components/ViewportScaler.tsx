import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  // Apply scale and update DOM
  const applyScaleToDOM = (targetScale: number) => {
    // Set CSS variables for element sizing
    const root = document.documentElement;
    root.style.setProperty('--tv-scale', targetScale.toString());
    root.style.setProperty('--base-font-size', `${16 * targetScale}px`);
    root.style.setProperty('--tile-width', `${320 * targetScale}px`);
    root.style.setProperty('--tile-height', `${180 * targetScale}px`);
    root.style.setProperty('--spacing-unit', `${16 * targetScale}px`);
    
    // Apply size class to body
    document.body.className = document.body.className.replace(/tv-scale-\d+/g, '');
    document.body.classList.add(`tv-scale-${Math.round(targetScale * 100)}`);
  };

  useEffect(() => {
    const detectAndApplyScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const screenWidth = window.screen?.width || 0;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // Check for saved manual scale override first
      const savedScale = localStorage.getItem('obtv-ui-scale');
      const manualOverride = localStorage.getItem('obtv-manual-override');
      
      // Remove any old manual overrides - always use auto-detection now
      localStorage.removeItem('obtv-ui-scale');
      localStorage.removeItem('obtv-manual-override');

      // Auto-detect scale based on TV/large display characteristics
      let autoScale = 1;
      
      // Very large displays (75"+ 4K TVs)
      if (viewportWidth >= 2400 || screenWidth >= 3840) {
        autoScale = 0.3; // Very aggressive scaling for massive displays
      } else if (viewportWidth >= 1920 || screenWidth >= 2560) {
        autoScale = 0.45; // Large displays - good balance
      } else if (viewportWidth >= 1600) {
        autoScale = 0.6; // Medium large displays
      } else if (viewportWidth >= 1280) {
        autoScale = 0.75; // Smaller large displays
      }
      
      console.log(`TV Auto-Scale Detection:`);
      console.log(`  Viewport: ${viewportWidth}x${viewportHeight}`);
      console.log(`  Screen: ${screenWidth}x${window.screen?.height || 0}`);
      console.log(`  DPR: ${devicePixelRatio}`);
      console.log(`  Applied Scale: ${autoScale}`);
      
      // Apply auto-detected scale
      setScale(autoScale);
      applyScaleToDOM(autoScale);
    };

    // Detect immediately
    detectAndApplyScale();
    
    // Re-detect on window resize
    window.addEventListener('resize', detectAndApplyScale);
    return () => window.removeEventListener('resize', detectAndApplyScale);
  }, []);

  return (
    <div style={{width: '100%', height: '100%'}}>
      {children}
    </div>
  );
};