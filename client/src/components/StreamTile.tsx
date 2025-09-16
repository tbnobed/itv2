import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import serverSnapshotService from '@/lib/ServerSnapshotService';

interface StreamTileProps {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  streamUrl?: string;
  category?: string;
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
  category = 'Live',
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


  // Netflix-style horizontal card sizing
  const cardDimensions = size === 'featured'
    ? 'w-[380px] h-[160px]'  // Featured cards: wider horizontal format
    : 'w-[320px] h-[130px]'; // Regular cards: compact horizontal format

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'overTheAir': return 'Over The Air';
      case 'liveFeeds': return 'Live Feeds';
      case 'uhd': return 'UHD • 4K';
      case 'featured': return 'Featured';
      case 'studios': return 'Studios';
      default: return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
  };

  return (
    <div
      className={cn(
        "relative cursor-pointer group outline-none",
        "rounded-xl overflow-hidden shadow-sm bg-gray-900",
        "transition-all duration-300 ease-out",
        "focus-visible:scale-110 focus-visible:z-30",
        "focus-visible:shadow-[0_0_25px_8px_rgba(51,102,255,0.4)]",
        cardDimensions,
        isHovered && "scale-105 z-20 shadow-[0_0_20px_6px_rgba(51,102,255,0.3)]",
        className
      )}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`stream-tile-${streamId}`}
    >
      {/* Horizontal Card Layout */}
      <div className="flex h-full">
        {/* Left Side - Preview Image */}
        <div className="relative w-2/5 h-full">
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
          
          {/* Live Indicator Overlay */}
          <div className="absolute top-2 left-2 flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1.5" />
            <span className="text-red-500 text-[10px] font-medium uppercase tracking-wide bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">LIVE</span>
          </div>
        </div>
        
        {/* Right Side - Stream Information */}
        <div className="relative w-3/5 h-full">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary to-primary/80" />
          
          {/* Content */}
          <div className="relative h-full p-4 flex flex-col justify-center">
            {/* Stream Title */}
            <h3 
              className={cn(
                "text-white font-bold leading-tight mb-2 line-clamp-2",
                size === 'featured' ? 'text-lg' : 'text-base'
              )}
              data-testid={`text-title-${streamId}`}
            >
              {title}
            </h3>
            
            {/* Stream Metadata */}
            <div className="text-white/90 space-y-1">
              <div className={cn(
                "font-medium text-white/80",
                size === 'featured' ? 'text-sm' : 'text-xs'
              )}>
                {getCategoryLabel(category)}
              </div>
              
              {/* Stream ID */}
              <div className={cn(
                "font-mono text-white/70",
                size === 'featured' ? 'text-xs' : 'text-[10px]'
              )}>
                ID: {streamId}
              </div>
            </div>
            
            {/* Bottom Right Corner - Quality Badge */}
            {category === 'uhd' && (
              <div className="absolute bottom-2 right-2">
                <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                  4K
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}