import { cn } from '@/lib/utils';
import StreamTile from './StreamTile';
import { useRef, useState, useEffect } from 'react';

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
  sectionId: string;
  onBackToStudios?: () => void;
}

export default function CategoryRow({ 
  title, 
  streams, 
  featured = false,
  variant = 'poster',
  onStreamSelect,
  className,
  sectionId,
  onBackToStudios
}: CategoryRowProps) {
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  if (!streams.length) return null;

  // Auto-focus first tile when this is a studio page
  useEffect(() => {
    if (onBackToStudios && tileRefs.current[0]) {
      setTimeout(() => {
        tileRefs.current[0]?.focus();
      }, 200);
    }
  }, [onBackToStudios]);

  // Update focusedIndex when tiles receive focus from external navigation
  const updateFocusedIndex = (index: number) => {
    setFocusedIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (focusedIndex > 0) {
          const newIndex = focusedIndex - 1;
          setFocusedIndex(newIndex);
          tileRefs.current[newIndex]?.focus();
          tileRefs.current[newIndex]?.scrollIntoView({ inline: 'center', block: 'nearest' });
        } else if (onBackToStudios) {
          // If we're at the first tile and in a studio page, go back to studios
          onBackToStudios();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (focusedIndex < streams.length - 1) {
          const newIndex = focusedIndex + 1;
          setFocusedIndex(newIndex);
          tileRefs.current[newIndex]?.focus();
          tileRefs.current[newIndex]?.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Always go to top navigation since there's no back button anymore
        const activeNavButton = document.querySelector('[data-active="true"]') as HTMLElement;
        if (activeNavButton) {
          activeNavButton.focus();
        } else {
          // Fallback to first nav button if active one isn't found
          const firstNavButton = document.querySelector('[data-nav-index="0"]') as HTMLElement;
          firstNavButton?.focus();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Find the next section below this one and focus its first tile
        const currentSection = document.querySelector(`[data-testid="section-${sectionId}"]`);
        if (currentSection) {
          // Look for the next section by getting all sections and finding the next one
          const allSections = Array.from(document.querySelectorAll('[data-testid^="section-"]'));
          const currentIndex = allSections.indexOf(currentSection);
          
          if (currentIndex !== -1 && currentIndex < allSections.length - 1) {
            // Focus the first tile in the next section
            const nextSection = allSections[currentIndex + 1];
            const firstTile = nextSection.querySelector('.stream-tile') as HTMLElement;
            if (firstTile) {
              firstTile.focus();
            }
          }
        }
        break;
    }
  };

  return (
    <div className={cn("relative mb-10 w-full", className)} data-testid={`section-${sectionId}`}>
      {/* Section Title */}
      <h2 
        className={cn(
          "text-white font-semibold mb-6 px-8",
          featured ? "text-2xl" : "text-xl"
        )}
      >
        {title}
      </h2>

      {/* Android TV Horizontal Scroll Layout */}
      <div className="w-full" data-testid="scroll-container">
        <div 
          className="overflow-x-auto overflow-y-visible scrollbar-hide px-8 py-2"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <div className={cn(
            "flex pb-8 w-max",
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
                  onFocus={() => updateFocusedIndex(index)}
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