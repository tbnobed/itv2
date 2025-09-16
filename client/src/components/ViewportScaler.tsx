import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  const applyScale = (newScale: number) => {
    setScale(newScale);
    localStorage.setItem('obtv-ui-scale', newScale.toString());
    localStorage.setItem('obtv-manual-override', 'true'); // Mark as manual override
    
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
    
    console.log(`Manual scale applied: ${newScale} (will override auto-detection)`);
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
      
      if (savedScale && manualOverride === 'true') {
        const parsed = parseFloat(savedScale);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 2) {
          console.log(`Using manual scale override: ${parsed}`);
          setScale(parsed);
          return;
        }
      }

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
      
      // Clear manual override flag and apply auto-detected scale
      localStorage.removeItem('obtv-manual-override');
      setScale(autoScale);
    };

    // Detect immediately
    detectAndApplyScale();
    
    // Re-detect on window resize
    window.addEventListener('resize', detectAndApplyScale);
    return () => window.removeEventListener('resize', detectAndApplyScale);
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
        <button onClick={() => {
          localStorage.removeItem('obtv-ui-scale');
          localStorage.removeItem('obtv-manual-override');
          window.location.reload();
        }} style={{padding: '4px 8px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '12px'}}>AUTO</button>
      </div>
      
      {/* Content with CSS variable sizing */}
      <div style={{width: '100%', height: '100%'}}>
        {children}
      </div>
    </div>
  );
};