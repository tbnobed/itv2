import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);
  const [userScale, setUserScale] = useState<number | null>(null);

  useEffect(() => {
    // Load user override from localStorage
    const savedScale = localStorage.getItem('obtv-ui-scale');
    if (savedScale) {
      const parsed = parseFloat(savedScale);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 2) {
        setUserScale(parsed);
        return;
      }
    }

    // Auto-detect appropriate scale - much more aggressive for large TVs
    const detectScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      let autoScale = 1;
      
      // VERY aggressive scaling for large displays
      if (viewportWidth >= 2400) {
        autoScale = 0.3; // Massive displays - tiny UI
      } else if (viewportWidth >= 1920) {
        autoScale = 0.4; // Large displays - very small UI
      } else if (viewportWidth >= 1600) {
        autoScale = 0.5; // Medium large displays
      } else if (viewportWidth >= 1280) {
        autoScale = 0.6; // Smaller large displays
      }
      
      console.log(`Auto-detected scale: ${autoScale} for viewport ${viewportWidth}x${viewportHeight}`);
      setScale(autoScale);
    };

    detectScale();
    window.addEventListener('resize', detectScale);
    return () => window.removeEventListener('resize', detectScale);
  }, []);

  // Apply user override if set
  const effectiveScale = userScale !== null ? userScale : scale;

  // Quick scale controls (temporary for debugging)
  const handleScaleChange = (newScale: number) => {
    setUserScale(newScale);
    localStorage.setItem('obtv-ui-scale', newScale.toString());
    console.log(`User set scale to: ${newScale}`);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', effectiveScale.toString());
  }, [effectiveScale]);

  return (
    <div 
      className="w-full h-full overflow-auto relative"
      style={{
        zoom: effectiveScale,
        width: '100%',
        height: '100%'
      }}
    >
      {/* Temporary scale controls - remove later */}
      <div className="fixed top-2 right-2 z-50 bg-black/80 text-white p-2 rounded space-x-2 text-sm">
        <span>Scale:</span>
        <button onClick={() => handleScaleChange(0.3)} className="px-2 py-1 bg-blue-600 rounded">0.3</button>
        <button onClick={() => handleScaleChange(0.45)} className="px-2 py-1 bg-blue-600 rounded">0.45</button>
        <button onClick={() => handleScaleChange(0.6)} className="px-2 py-1 bg-blue-600 rounded">0.6</button>
        <button onClick={() => handleScaleChange(1.0)} className="px-2 py-1 bg-blue-600 rounded">1.0</button>
        <span className="ml-2">Current: {effectiveScale}</span>
      </div>
      
      {children}
    </div>
  );
};