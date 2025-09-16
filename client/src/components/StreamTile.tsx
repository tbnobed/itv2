import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import serverSnapshotService from '@/lib/ServerSnapshotService';

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

  // Register for server-side snapshots and update image URL periodically
  useEffect(() => {
    if (!streamUrl) return;

    console.log(`StreamTile[${streamId}]: Registering for server-side snapshots`);
    
    // Register stream with server-side snapshot service
    serverSnapshotService.registerStream(streamId);
    
    // Set up periodic image URL refresh (every 30 seconds to match server snapshot rate)
    const updateSnapshotUrl = () => {
      const snapshotUrl = serverSnapshotService.getSnapshotUrl(streamId, thumbnail);
      setCurrentImage(snapshotUrl);
      console.log(`StreamTile[${streamId}]: Updated to server snapshot URL: ${snapshotUrl}`);
    };
    
    // Update immediately and then every 30 seconds
    updateSnapshotUrl();
    const refreshInterval = setInterval(updateSnapshotUrl, 30000);

    return () => {
      // Unregister when component unmounts
      console.log(`StreamTile[${streamId}]: Unregistering from server-side snapshots`);
      serverSnapshotService.unregisterStream(streamId);
      clearInterval(refreshInterval);
    };
  }, [streamUrl, streamId, thumbnail]);

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


  // Android TV card sizing - more consistent with TV interface standards
  const tileSize = size === 'featured' 
    ? 'w-72 h-40'  // Featured cards are larger
    : 'w-56 h-32'; // Regular cards

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-300 rounded-xl overflow-hidden group",
        "focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none",
        "bg-gray-800 shadow-lg hover:shadow-2xl",
        tileSize,
        isHovered && "scale-105 z-10 ring-4 ring-white/80 shadow-2xl",
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
          // Fallback to thumbnail when server snapshot is not available
          if (currentImage !== thumbnail) {
            console.log(`StreamTile[${streamId}]: Server snapshot failed to load, falling back to thumbnail`);
            setCurrentImage(thumbnail);
          } else {
            console.log(`StreamTile[${streamId}]: Thumbnail also failed to load`);
          }
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