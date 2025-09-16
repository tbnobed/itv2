import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [currentScale, setCurrentScale] = useState(1);

  // Direct CSS manipulation for immediate effect
  const applyScale = (scale: number) => {
    setCurrentScale(scale);
    localStorage.setItem('obtv-ui-scale', scale.toString());
    
    // Apply to document body directly
    document.body.style.zoom = scale.toString();
    document.body.style.transformOrigin = '0 0';
    
    console.log(`Applied scale: ${scale} via CSS zoom and transform`);
  };

  useEffect(() => {
    // Check for saved scale first
    const savedScale = localStorage.getItem('obtv-ui-scale');
    if (savedScale) {
      const parsed = parseFloat(savedScale);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 2) {
        applyScale(parsed);
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
    applyScale(autoScale);
  }, []);

  return (
    <>
      {/* Scale controls */}
      <div style={{
        position: 'fixed',
        top: '8px',
        right: '8px',
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <span>Scale:</span>
        <button onClick={() => applyScale(0.3)} style={{padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer'}}>0.3</button>
        <button onClick={() => applyScale(0.45)} style={{padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer'}}>0.45</button>
        <button onClick={() => applyScale(0.6)} style={{padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer'}}>0.6</button>
        <button onClick={() => applyScale(1.0)} style={{padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer'}}>1.0</button>
        <span>Current: {currentScale}</span>
      </div>
      
      {children}
    </>
  );
};