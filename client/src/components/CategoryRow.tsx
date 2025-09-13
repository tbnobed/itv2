import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StreamTile from './StreamTile';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
}

interface CategoryRowProps {
  title: string;
  streams: StreamData[];
  featured?: boolean;
  onStreamSelect?: (streamId: string, url: string) => void;
  className?: string;
}

export default function CategoryRow({ 
  title, 
  streams, 
  featured = false, 
  onStreamSelect,
  className 
}: CategoryRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [streams]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = featured ? 320 : 240; // Width of one tile
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && canScrollLeft) {
      scroll('left');
    } else if (e.key === 'ArrowRight' && canScrollRight) {
      scroll('right');
    }
  };

  if (!streams.length) return null;

  return (
    <div className={cn("relative mb-8", className)}>
      {/* Section Title */}
      <h2 
        className={cn(
          "text-white font-bold mb-4 px-6",
          featured ? "text-2xl" : "text-xl"
        )}
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
      </h2>

      {/* Navigation Buttons */}
      {canScrollLeft && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
          onClick={() => scroll('left')}
          data-testid="button-scroll-left"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      {canScrollRight && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
          onClick={() => scroll('right')}
          data-testid="button-scroll-right"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide focus-visible:outline-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        tabIndex={0}
        onKeyDown={handleKeyNavigation}
        data-testid="scroll-container"
      >
        <div className={cn(
          "flex gap-4 px-6",
          featured ? "pb-4" : "pb-2"
        )}>
          {streams.map((stream) => (
            <StreamTile
              key={stream.id}
              id={stream.id}
              title={stream.title}
              thumbnail={stream.thumbnail}
              streamId={stream.streamId}
              size={featured ? 'featured' : 'regular'}
              onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
              className="flex-shrink-0"
            />
          ))}
        </div>
      </div>

    </div>
  );
}