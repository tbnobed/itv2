import { useEffect, useRef, useState } from 'react';

export function useTileResize() {
  const ref = useRef<HTMLDivElement>(null);
  const [tileWidth, setTileWidth] = useState(150); // Default base width
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setTileWidth(width);
        }
      }
    });
    
    observer.observe(element);
    
    // Set initial width
    const width = element.offsetWidth;
    if (width > 0) {
      setTileWidth(width);
    }
    
    return () => observer.disconnect();
  }, []);
  
  // Calculate scale relative to 150px base
  const tileScale = tileWidth / 150;
  
  // CSS variables for proportional scaling
  const tileStyle = {
    '--tile-w': `${tileWidth}px`,
    '--tile-scale': tileScale.toString(),
  } as React.CSSProperties;
  
  return { ref, tileWidth, tileScale, tileStyle };
}