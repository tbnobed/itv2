import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import serverSnapshotService from '@/lib/ServerSnapshotService';
import { useTileResize } from '@/hooks/useTileResize';

interface StreamTileProps {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  streamUrl?: string;
  size?: 'featured' | 'regular';
  variant?: 'poster' | 'compact';
  textPosition?: 'overlay' | 'below';
  subtitle?: string;
  metaLeft?: string;
  metaRight?: string;
  tabIndex?: number;
  onSelect?: (streamId: string) => void;
  onFocus?: () => void;
  className?: string;
}

const StreamTile = React.forwardRef(({ 
  id, 
  title, 
  thumbnail, 
  streamId,
  streamUrl,
  size = 'regular',
  variant = 'poster',
  textPosition = 'overlay',
  subtitle,
  metaLeft,
  metaRight,
  tabIndex,
  onSelect,
  onFocus,
  className 
}: StreamTileProps, ref: React.Ref<HTMLDivElement>) => {
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

  const handleClick = async (e?: React.MouseEvent) => {
    console.log(`Opening stream: ${streamId} - ${title}`);
    
    // If this was a mouse click, blur the element to prevent focus ring
    if (e && e.type === 'click') {
      (e.currentTarget as HTMLElement).blur();
    }
    
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

  const handleFocus = (e: React.FocusEvent) => {
    console.log(`StreamTile[${streamId}]: FOCUS EVENT received`);
  };

  const handleBlur = (e: React.FocusEvent) => {
    console.log(`StreamTile[${streamId}]: BLUR EVENT received`);
  };

  // Dynamic tile sizing for proportional text
  // Removed dynamic scaling - no more growing tiles
  
  // Simple ref forwarding without scaling
  const setRef = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };


  // Card sizing based on variant and size
  const cardClasses = variant === 'compact' ? {
    wrapper: cn(
      "relative cursor-pointer group rounded-xl",
      "hover:ring-4 hover:ring-blue-500 hover:ring-offset-2 hover:ring-offset-neutral-900 hover:z-10",
      "focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:z-10",
      size === 'featured' ? 'w-[252px]' : 'w-[189px]',
      className
    ),
    container: cn(
      "aspect-[3/1] rounded-lg overflow-hidden shadow-sm bg-gray-900",
      "",
      "",
      isHovered && "z-20"
    )
  } : {
    container: cn(
      "relative cursor-pointer group outline-none",
      "aspect-[16/9] rounded-lg overflow-hidden shadow-sm bg-gray-800",
      "",
      "focus-visible:z-30",
      "focus-visible:shadow-[0_0_25px_8px_rgba(51,102,255,0.4)]",
      size === 'featured' ? 'w-[180px]' : 'w-[135px]',
      isHovered && "z-20 shadow-[0_0_20px_6px_rgba(51,102,255,0.3)]",
      className
    )
  };

  if (variant === 'compact') {
    return (
      <div
        ref={ref}
        className={cardClasses.wrapper}
        tabIndex={tabIndex}
        onClick={handleClick}
        onKeyDown={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`stream-tile-${streamId}`}
      >
        <div className={cardClasses.container}>
        {/* Compact Layout: Grid with Image Left, Info Right */}
        <div className="grid grid-cols-[1fr_2.5fr] w-full h-full">
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-red-900/30 to-red-800/40" />
            
            {/* Loading Skeleton - Text */}
            {isLoading || !isImageLoaded ? (
              <div className="absolute inset-0 p-2 flex flex-col justify-center gap-1">
                <div className="h-3 bg-gray-700 rounded animate-pulse" />
                <div className="h-2 bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-gray-700 rounded w-1/2 animate-pulse" />
              </div>
            ) : (
              <div className={cn(
                "absolute inset-0 flex flex-col justify-center text-white overflow-hidden",
                size === 'featured' ? 'p-2 gap-0' : 'p-1.5 gap-0'
              )}>
                {/* Main Title */}
                <h3 
                  className={cn(
                    "font-medium line-clamp-1 leading-none text-ellipsis overflow-hidden",
                    size === 'featured' ? 'text-[10px]' : 'text-[9px]'
                  )}
                  data-testid={`text-title-${streamId}`}
                  title={title}
                >
                  {title}
                </h3>
                
                {/* Subtitle */}
                {subtitle && (
                  <p 
                    className="text-[8px] text-white/70 line-clamp-1 leading-none overflow-hidden"
                    data-testid={`text-subtitle-${streamId}`}
                    title={subtitle}
                  >
                    {subtitle}
                  </p>
                )}
                
                {/* Metadata Row */}
                <div className="flex items-center justify-between w-full mt-0.5">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Live Badge */}
                    <div className="flex items-center">
                      <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse mr-0.5" />
                      <span className="text-red-500 text-[7px] font-medium uppercase tracking-wide">LIVE</span>
                    </div>
                    
                    {/* Stream ID */}
                    <div className="bg-black/40 backdrop-blur-sm px-1 py-0.5 rounded text-[7px] text-white/80 font-mono">
                      {streamId}
                    </div>
                  </div>
                  
                  {/* Right side metadata */}
                  <div className="flex items-center gap-1 text-[7px] text-white/60 flex-shrink-0">
                    {metaLeft && <span>{metaLeft}</span>}
                    {metaRight && <span>{metaRight}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Poster Layout - overlay or below text based on textPosition prop
  if (textPosition === 'overlay') {
    // Original overlay layout for Featured section
    return (
      <div
        ref={ref}
        className={cn(
          "relative cursor-pointer group outline-none stream-tile",
          "aspect-[16/9] rounded-lg overflow-hidden shadow-sm bg-gray-800",
          "",
          "focus-visible:z-30",
          "focus-visible:shadow-[0_0_25px_8px_rgba(51,102,255,0.4)]",
          size === 'featured' ? 'w-[230px]' : 'w-[168px]',
          isHovered && "z-20 shadow-[0_0_20px_6px_rgba(51,102,255,0.3)]",
          className
        )}
        tabIndex={tabIndex ?? 0}
        onClick={handleClick}
        onKeyDown={handleKeyPress}
        onFocus={onFocus}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`stream-tile-${streamId}`}
      >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Content - Bottom Left */}
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <h3 
            className={cn(
              "text-white font-medium leading-tight line-clamp-2 mb-1",
              size === 'featured' ? 'text-sm' : 'text-xs'
            )}
            data-testid={`text-title-${streamId}`}
          >
            {title}
          </h3>
          
          {/* Live Indicator */}
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
            <span className="text-red-500 text-[11px] font-medium uppercase tracking-wide">LIVE</span>
          </div>
        </div>
        
        {/* Stream ID Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2">
          <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[11px] text-white/80 font-mono">
            {streamId}
          </div>
        </div>
      </div>
    );
  }

  // Below text layout for Grid sections
  return (
    <div
      ref={setRef}
      style={undefined}
      className={cn(
        "relative cursor-pointer group outline-none stream-tile",
        "focus-visible:z-30 focus-visible:shadow-[0_0_25px_8px_rgba(51,102,255,0.4)]"
      )}
      tabIndex={tabIndex ?? 0}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      onFocus={onFocus}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`stream-tile-${streamId}`}
    >
      {/* Single Card Wrapper */}
      <div className={cn(
        "rounded-lg overflow-hidden bg-gray-900 shadow-sm transition-all duration-300 ease-out",
        size === 'featured' ? 'w-[255px]' : 'w-[187px]',
        isHovered && "z-20 shadow-[0_0_20px_6px_rgba(51,102,255,0.3)]",
        className
      )}>
        {/* Image Area */}
        <div className="relative aspect-[16/9] bg-gray-800">
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
        </div>
        
        {/* Info Footer - Inside Same Card */}
        <div className="p-3 bg-black/60 backdrop-blur-sm">
          {/* Stream Title */}
          <h3 
            className={cn(
              "text-white font-medium leading-tight line-clamp-2 mb-2 stream-tile-title",
              size === 'featured' ? 'text-sm' : 'text-xs'
            )}
            data-testid={`text-title-${streamId}`}
            title={title}
          >
            {title}
          </h3>
          
          {/* Bottom Row - Live Indicator and Stream ID */}
          <div className="flex items-center justify-between">
            {/* Live Indicator */}
            <div className="flex items-center">
              <div className="bg-red-500 rounded-full animate-pulse mr-1 w-1.5 h-1.5" />
              <span className="text-red-500 font-medium uppercase tracking-wide text-[10px]">LIVE</span>
            </div>
            
            {/* Stream ID */}
            <div className="bg-black/40 px-1.5 py-0.5 rounded text-white/60 font-mono text-[10px]">
              {streamId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StreamTile;