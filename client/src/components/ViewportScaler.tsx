import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  const applyScale = (newScale: number) => {
    setScale(newScale);
    localStorage.setItem('obtv-ui-scale', newScale.toString());
    console.log(`Applied scale: ${newScale} via wrapper transform`);
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
      
      {/* Wrapper that actually gets scaled */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {children}
      </div>
    </div>
  );
};