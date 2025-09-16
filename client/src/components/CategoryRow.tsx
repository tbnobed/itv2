import { cn } from '@/lib/utils';
import StreamTile from './StreamTile';
import { useRef, useState } from 'react';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
  category?: string;
}

interface CategoryRowProps {
  title: string;
  streams: StreamData[];
  featured?: boolean;
  variant?: 'poster' | 'compact';
  onStreamSelect?: (streamId: string, url: string) => void;
  className?: string;
}

export default function CategoryRow({ 
  title, 
  streams, 
  featured = false,
  variant = 'poster',
  onStreamSelect,
  className 
}: CategoryRowProps) {
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  if (!streams.length) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && focusedIndex > 0) {
      e.preventDefault();
      const newIndex = focusedIndex - 1;
      setFocusedIndex(newIndex);
      tileRefs.current[newIndex]?.focus();
      tileRefs.current[newIndex]?.scrollIntoView({ 
        inline: 'center', 
        block: 'nearest',
        behavior: 'smooth'
      });
    } else if (e.key === 'ArrowRight' && focusedIndex < streams.length - 1) {
      e.preventDefault();
      const newIndex = focusedIndex + 1;
      setFocusedIndex(newIndex);
      tileRefs.current[newIndex]?.focus();
      tileRefs.current[newIndex]?.scrollIntoView({ 
        inline: 'center', 
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={cn("relative mb-10 w-full", className)}>
      {/* Section Title */}
      <h2 
        className={cn(
          "text-white font-semibold mb-6 px-8",
          featured ? "text-2xl" : "text-xl"
        )}
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
      </h2>

      {/* Android TV Horizontal Carousel Layout */}
      <div className="w-full" data-testid="scroll-container">
        <div 
          className="overflow-x-auto overflow-y-visible scrollbar-hide py-2"
          style={{ scrollBehavior: 'smooth' }}
          onKeyDown={handleKeyDown}
        >
          <div className={cn(
            "flex pb-8 w-max px-8",
            variant === 'compact' ? 'gap-4' : 'gap-6'
          )}>
            {streams.map((stream, index) => {
              // Generate subtitle and metadata for compact cards
              const subtitle = variant === 'compact' ? `Streaming from ${stream.category || 'Live'} feed` : undefined;
              const metaLeft = variant === 'compact' ? '4K UHD' : undefined;
              const metaRight = variant === 'compact' ? 'HD' : undefined;
              
              return (
                <StreamTile
                  key={stream.id}
                  ref={(el) => tileRefs.current[index] = el}
                  id={stream.id}
                  title={stream.title}
                  thumbnail={stream.thumbnail}
                  streamId={stream.streamId}
                  streamUrl={stream.url}
                  size={featured ? 'featured' : 'regular'}
                  variant={variant}
                  subtitle={subtitle}
                  metaLeft={metaLeft}
                  metaRight={metaRight}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
                  className="flex-shrink-0"
                />
              );
            })}
          
          </div>
        </div>
      </div>
    </div>
  );
}