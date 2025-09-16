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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
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


  // Android TV card sizing - proper 16:9 aspect ratios
  const cardWidth = size === 'featured' 
    ? 'w-[320px]'  // Featured cards: 320x180px (16:9)
    : 'w-[240px]'; // Regular cards: 240x135px (16:9)

  return (
    <div
      className={cn(
        "relative cursor-pointer group outline-none",
        "aspect-[16/9] rounded-lg overflow-hidden shadow-sm bg-gray-800",
        "transition-all duration-300 ease-out",
        "focus-visible:scale-110 focus-visible:z-30",
        "focus-visible:ring-6 focus-visible:ring-[hsl(240,100%,60%)]",
        "focus-visible:shadow-[0_0_20px_rgba(51,102,255,0.6)]",
        "focus-visible:drop-shadow-2xl",
        cardWidth,
        isHovered && "scale-105 z-20 ring-4 ring-[hsl(240,100%,60%)] shadow-[0_0_15px_rgba(51,102,255,0.4)] drop-shadow-xl",
        className
      )}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`stream-tile-${streamId}`}
    >
      {/* Card Content */}
      <div className="relative w-full h-full">
        {/* Loading Skeleton */}
        {isLoading || !isImageLoaded ? (
          <div className="w-full h-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]" />
        ) : null}
        
        {/* Live Preview Image */}
        <img
          src={currentImage}
          alt={title}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            isImageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => {
            setIsImageLoaded(true);
          }}
          onError={(e) => {
            // Fallback to thumbnail when server snapshot is not available
            if (currentImage !== thumbnail) {
              console.log(`StreamTile[${streamId}]: Server snapshot failed to load, falling back to thumbnail`);
              setCurrentImage(thumbnail);
              setIsImageLoaded(false); // Reset to show skeleton while fallback loads
            } else {
              console.log(`StreamTile[${streamId}]: Thumbnail also failed to load`);
              setIsImageLoaded(true); // Stop skeleton even if image failed
            }
          }}
        />
        
        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Content - Bottom Left */}
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <h3 
            className={cn(
              "text-white font-medium leading-tight line-clamp-2 mb-1",
              size === 'featured' ? 'text-base' : 'text-sm'
            )}
            data-testid={`text-title-${streamId}`}
          >
            {title}
          </h3>
          
          {/* Live Indicator */}
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
            <span className="text-red-500 text-xs font-medium uppercase tracking-wide">LIVE</span>
          </div>
        </div>
        
        {/* Stream ID Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2">
          <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80 font-mono">
            {streamId}
          </div>
        </div>
      </div>
    </div>
  );
}