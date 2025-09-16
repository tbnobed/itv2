import React, { useEffect, useState } from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

export const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      // Fixed app dimensions
      const APP_WIDTH = 960;
      const APP_HEIGHT = 540;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate scale to fit viewport while maintaining aspect ratio
      const scaleX = viewportWidth / APP_WIDTH;
      const scaleY = viewportHeight / APP_HEIGHT;
      const finalScale = Math.min(scaleX, scaleY);
      
      setScale(finalScale);
      
      console.log(`🔧 TV Auto-Scale:`);
      console.log(`  📺 Viewport: ${viewportWidth}x${viewportHeight}`);
      console.log(`  📱 App Size: ${APP_WIDTH}x${APP_HEIGHT}`);
      console.log(`  ⚡ Scale: ${finalScale.toFixed(3)}`);
      console.log(`  📐 Final Size: ${Math.round(APP_WIDTH * finalScale)}x${Math.round(APP_HEIGHT * finalScale)}`);
    };

    calculateScale();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '960px',
        height: '540px',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        backgroundColor: '#000',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
};