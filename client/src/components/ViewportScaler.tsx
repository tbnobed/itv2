import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  const applyScale = (newScale: number) => {
    setScale(newScale);
    localStorage.setItem('obtv-ui-scale', newScale.toString());
    
    // Set CSS variables for element sizing
    const root = document.documentElement;
    root.style.setProperty('--tv-scale', newScale.toString());
    root.style.setProperty('--base-font-size', `${16 * newScale}px`);
    root.style.setProperty('--tile-width', `${320 * newScale}px`);
    root.style.setProperty('--tile-height', `${180 * newScale}px`);
    root.style.setProperty('--spacing-unit', `${16 * newScale}px`);
    
    // Apply size class to body
    document.body.className = document.body.className.replace(/tv-scale-\d+/g, '');
    document.body.classList.add(`tv-scale-${Math.round(newScale * 100)}`);
    
    console.log(`Applied scale: ${newScale} via CSS variables and size classes`);
  };

  useEffect(() => {
    // Check for saved scale first
    const savedScale = localStorage.getItem('obtv-ui-scale');
    if (savedScale) {
      const parsed = parseFloat(savedScale);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 2) {
        setScale(parsed);
        return;
      }
    }

    // Auto-detect based on viewport
    const viewportWidth = window.innerWidth;
    let autoScale = 1;
    
    if (viewportWidth >= 2400) {
      autoScale = 0.3; // Massive displays
    } else if (viewportWidth >= 1920) {
      autoScale = 0.4; // Large displays  
    } else if (viewportWidth >= 1600) {
      autoScale = 0.5; // Medium large displays
    } else if (viewportWidth >= 1280) {
      autoScale = 0.6; // Smaller large displays
    }
    
    console.log(`Auto-detected scale: ${autoScale} for viewport ${viewportWidth}px`);
    setScale(autoScale);
  }, []);

  return (
    <div 
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Scale controls - always visible */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 99999,
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '14px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontFamily: 'monospace'
      }}>
        <span>TV Scale:</span>
        <button onClick={() => applyScale(0.3)} style={{padding: '8px 12px', backgroundColor: scale === 0.3 ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>0.3</button>
        <button onClick={() => applyScale(0.45)} style={{padding: '8px 12px', backgroundColor: scale === 0.45 ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>0.45</button>
        <button onClick={() => applyScale(0.6)} style={{padding: '8px 12px', backgroundColor: scale === 0.6 ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>0.6</button>
        <button onClick={() => applyScale(1.0)} style={{padding: '8px 12px', backgroundColor: scale === 1.0 ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'}}>1.0</button>
        <span style={{color: '#fbbf24'}}>Active: {scale}</span>
      </div>
      
      {/* Content with CSS variable sizing */}
      <div style={{width: '100%', height: '100%'}}>
        {children}
      </div>
    </div>
  );
};