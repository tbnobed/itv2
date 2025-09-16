import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Clear any old localStorage values
    localStorage.removeItem('obtv-ui-scale');
    localStorage.removeItem('obtv-manual-override');
    
    const viewportWidth = window.innerWidth;
    const screenWidth = window.screen?.width || 0;
    
    // Auto-detect scale based on viewport size - more aggressive scaling
    let autoScale = 1;
    
    if (viewportWidth >= 2400 || screenWidth >= 3840) {
      autoScale = 0.3; // 75"+ 4K TVs
    } else if (viewportWidth >= 1920 || screenWidth >= 2560) {
      autoScale = 0.45; // Large displays
    } else if (viewportWidth >= 1600) {
      autoScale = 0.6; // Medium displays
    } else if (viewportWidth >= 1280) {
      autoScale = 0.75; // Smaller displays
    }
    
    // Set CSS variables immediately
    const root = document.documentElement;
    root.style.setProperty('--tv-scale', autoScale.toString());
    root.style.setProperty('--base-font-size', `${16 * autoScale}px`);
    root.style.setProperty('--tile-width', `${320 * autoScale}px`);
    root.style.setProperty('--tile-height', `${180 * autoScale}px`);
    root.style.setProperty('--spacing-unit', `${16 * autoScale}px`);
    
    // Apply size class to body
    document.body.className = document.body.className.replace(/tv-scale-\d+/g, '');
    document.body.classList.add(`tv-scale-${Math.round(autoScale * 100)}`);
    
    // Update component state
    setScale(autoScale);
    
    // Force a visual confirmation by adding a temporary indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,255,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 999999;
      font-family: monospace;
      font-size: 14px;
    `;
    indicator.textContent = `TV Scale: ${autoScale} (${viewportWidth}px)`;
    document.body.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
  }, []);

  return (
    <div style={{width: '100%', height: '100%'}}>
      {children}
    </div>
  );
};