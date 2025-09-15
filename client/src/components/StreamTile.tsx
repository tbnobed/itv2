import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import WebRTCPreview from './WebRTCPreview';
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
  const [isFocused, setIsFocused] = useState(false);
  const previewManager = PreviewManager.getInstance();

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

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    console.log(`StreamTile ${streamId} gained focus`);
  }, [streamId]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    console.log(`StreamTile ${streamId} lost focus`);
  }, [streamId]);

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
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`stream-tile-${streamId}`}
    >
      {/* Live Video Preview */}
      {streamUrl ? (
        <WebRTCPreview
          streamUrl={streamUrl}
          streamId={streamId}
          isActive={isFocused}
          className="w-full h-full relative"
          fallbackImage={thumbnail}
        />
      ) : (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover bg-card"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk9CVFYgTG9nbzwvdGV4dD48L3N2Zz4=';
          }}
        />
      )}
      
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