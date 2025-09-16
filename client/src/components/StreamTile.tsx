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
  variant?: 'poster' | 'compact';
  subtitle?: string;
  metaLeft?: string;
  metaRight?: string;
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
  variant = 'poster',
  subtitle,
  metaLeft,
  metaRight,
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


  // Card sizing based on variant and size
  const cardClasses = variant === 'compact' ? {
    container: cn(
      "relative cursor-pointer group outline-none",
      "aspect-[16/6] rounded-lg overflow-hidden shadow-lg bg-gray-900",
      "transition-all duration-300 ease-out will-change-transform",
      "focus-visible:scale-105 focus-visible:z-30 focus-visible:ring-4 focus-visible:ring-blue-500/50",
      "hover:scale-102 hover:z-20",
      size === 'featured' ? 'w-[400px]' : 'w-[320px]',
      isHovered && "scale-102 z-20",
      className
    )
  } : {
    container: cn(
      "relative cursor-pointer group outline-none",
      "aspect-[16/9] rounded-lg overflow-hidden shadow-sm bg-gray-800",
      "transition-all duration-300 ease-out",
      "focus-visible:scale-110 focus-visible:z-30",
      "focus-visible:shadow-[0_0_25px_8px_rgba(51,102,255,0.4)]",
      size === 'featured' ? 'w-[320px]' : 'w-[240px]',
      isHovered && "scale-105 z-20 shadow-[0_0_20px_6px_rgba(51,102,255,0.3)]",
      className
    )
  };

  if (variant === 'compact') {
    return (
      <div
        className={cardClasses.container}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyPress}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`stream-tile-${streamId}`}
      >
        {/* Compact Layout: Grid with Image Left, Info Right */}
        <div className="grid grid-cols-[1fr_2fr] w-full h-full">
          {/* Left: Image (1/3) */}
          <div className="relative overflow-hidden">
            {/* Loading Skeleton - Image */}
            {isLoading || !isImageLoaded ? (
              <div className="w-full h-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]" />
            ) : null}
            
            <img
              src={currentImage}
              alt={title}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-200",
                "mask-image: linear-gradient(to right, black 85%, transparent)",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                if (currentImage !== thumbnail) {
                  console.log(`StreamTile[${streamId}]: Server snapshot failed to load, falling back to thumbnail`);
                  setCurrentImage(thumbnail);
                  setIsImageLoaded(false);
                } else {
                  console.log(`StreamTile[${streamId}]: Thumbnail also failed to load`);
                  setIsImageLoaded(true);
                }
              }}
            />
          </div>
          
          {/* Right: Info Panel (2/3) */}
          <div className="relative">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/95 via-red-500/90 to-red-600/95" />
            
            {/* Loading Skeleton - Text */}
            {isLoading || !isImageLoaded ? (
              <div className="absolute inset-0 p-4 flex flex-col justify-center gap-2">
                <div className="h-4 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
              </div>
            ) : (
              <div className={cn(
                "absolute inset-0 flex flex-col justify-between text-white",
                size === 'featured' ? 'p-4' : 'p-3'
              )}>
                {/* Top Section - Title & Subtitle */}
                <div className="flex flex-col justify-center flex-1">
                  {/* Main Title */}
                  <h3 
                    className={cn(
                      "font-bold line-clamp-2 leading-tight mb-1",
                      size === 'featured' ? 'text-2xl' : 'text-xl'
                    )}
                    data-testid={`text-title-${streamId}`}
                  >
                    {title}
                  </h3>
                  
                  {/* Subtitle */}
                  {subtitle && (
                    <p 
                      className={cn(
                        "text-white/90 line-clamp-1 leading-tight uppercase tracking-wide font-medium",
                        size === 'featured' ? 'text-sm' : 'text-xs'
                      )}
                      data-testid={`text-subtitle-${streamId}`}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                
                {/* Bottom Section - Metadata */}
                <div className={cn(
                  "flex items-center gap-2 text-white/80",
                  size === 'featured' ? 'text-sm' : 'text-xs'
                )}>
                  {/* Meta Left & Right for Android TV style */}
                  {metaLeft && (
                    <span className="font-medium">{metaLeft}</span>
                  )}
                  {metaLeft && metaRight && (
                    <span className="text-white/60">•</span>
                  )}
                  {metaRight && (
                    <span className="font-medium">{metaRight}</span>
                  )}
                  {(metaLeft || metaRight) && (
                    <span className="text-white/60">•</span>
                  )}
                  <span className="font-medium">Live Stream</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Poster Layout (existing)
  return (
    <div
      className={cardClasses.container}
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