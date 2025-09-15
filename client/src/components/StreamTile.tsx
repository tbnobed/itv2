import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import PreviewManager from '@/lib/PreviewManager';

interface StreamTileProps {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  streamUrl?: string;
  size?: 'featured' | 'regular';
  onSelect?: (streamId: string) => void;
  className?: string;
}

export default function StreamTile({ 
  id, 
  title, 
  thumbnail, 
  streamId,
  streamUrl,
  size = 'regular', 
  onSelect,
  className 
}: StreamTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(thumbnail);

  // Register for live snapshot updates if streamUrl is available
  useEffect(() => {
    if (!streamUrl) return;

    const previewManager = PreviewManager.getInstance();
    
    const handleSnapshot = (dataUrl: string) => {
      // Only update if we have a valid dataURL with actual image data
      if (dataUrl && dataUrl.startsWith('data:image/') && dataUrl.length > 100) {
        setCurrentImage(dataUrl);
      }
    };

    // Register for snapshots
    previewManager.registerStreamForSnapshot(streamId, streamUrl, handleSnapshot);

    return () => {
      // Unregister when component unmounts
      previewManager.unregisterStreamFromSnapshot(streamId);
    };
  }, [streamUrl, streamId]);

  const handleClick = async () => {
    console.log(`Opening stream: ${streamId} - ${title}`);
    setIsLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      onSelect?.(streamId);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };


  const tileSize = size === 'featured' 
    ? 'w-58 h-34' 
    : 'w-44 h-24';

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-300 rounded-md overflow-hidden group focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none shadow-lg hover:shadow-2xl hover:shadow-primary/20",
        tileSize,
        isHovered && "scale-105 z-10 shadow-2xl shadow-primary/30",
        isLoading && "opacity-50",
        className
      )}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`stream-tile-${streamId}`}
    >
      {/* Live Preview Image */}
      <img
        src={currentImage}
        alt={title}
        className="w-full h-full object-cover bg-card"
        onError={(e) => {
          e.currentTarget.src = thumbnail;
        }}
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end">
        
        {/* Title */}
        <h3 
          className={cn(
            "text-white font-medium leading-tight line-clamp-2",
            size === 'featured' ? 'text-lg' : 'text-sm'
          )}
          data-testid={`text-title-${streamId}`}
        >
          {title}
        </h3>
        
        {/* Live Indicator */}
        <div className="flex items-center mt-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
          <span className="text-red-500 text-xs font-medium uppercase tracking-wide">LIVE</span>
        </div>
      </div>
      
      {/* Hover Glow Effect */}
      {isHovered && (
        <div className="absolute inset-0 ring-2 ring-primary/60 rounded-md pointer-events-none" />
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}