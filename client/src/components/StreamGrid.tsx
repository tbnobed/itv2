import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import StreamTile from './StreamTile';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
}

interface StreamGridProps {
  title: string;
  streams: StreamData[];
  onStreamSelect?: (streamId: string, url: string) => void;
  className?: string;
  sectionId: string;
}

export default function StreamGrid({ 
  title, 
  streams, 
  onStreamSelect,
  className,
  sectionId
}: StreamGridProps) {
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const tileRefs = useRef<(HTMLDivElement | null)[][]>([]);
  
  // Group streams into rows of 4
  const streamRows: StreamData[][] = [];
  for (let i = 0; i < streams.length; i += 4) {
    streamRows.push(streams.slice(i, i + 4));
  }

  // Tile refs are initialized by ref callbacks - no need to pre-initialize

  // Only auto-focus on initial mount, not on navigation returns
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (streamRows.length > 0 && !hasInitialized && tileRefs.current[0]?.[0]) {
      const timer = setTimeout(() => {
        tileRefs.current[0][0]?.focus();
        setHasInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [streamRows.length, hasInitialized]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (focusedCol > 0) {
          setFocusedCol(focusedCol - 1);
          tileRefs.current[focusedRow]?.[focusedCol - 1]?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (focusedCol < streamRows[focusedRow]?.length - 1) {
          setFocusedCol(focusedCol + 1);
          tileRefs.current[focusedRow]?.[focusedCol + 1]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusedRow > 0) {
          setFocusedRow(focusedRow - 1);
          // Adjust column if new row has fewer items
          const newCol = Math.min(focusedCol, streamRows[focusedRow - 1].length - 1);
          setFocusedCol(newCol);
          tileRefs.current[focusedRow - 1]?.[newCol]?.focus();
        } else {
          // Exit grid to top navigation when on first row
          const activeNavButton = document.querySelector('[data-active="true"]') as HTMLElement;
          if (activeNavButton) {
            activeNavButton.focus();
          } else {
            // Fallback to first nav button if active one isn't found
            const firstNavButton = document.querySelector('[data-nav-index="0"]') as HTMLElement;
            firstNavButton?.focus();
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (focusedRow < streamRows.length - 1) {
          setFocusedRow(focusedRow + 1);
          // Adjust column if new row has fewer items
          const newCol = Math.min(focusedCol, streamRows[focusedRow + 1].length - 1);
          setFocusedCol(newCol);
          tileRefs.current[focusedRow + 1]?.[newCol]?.focus();
        }
        break;
    }
  };

  return (
    <div className={cn("w-full", className)} data-testid={`section-${sectionId}`}>
      {/* 4-Column Grid - No Scrolling */}
      <div className="w-full px-8" onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="flex flex-col gap-8">
          {streamRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-4 gap-6 w-full">
              {row.map((stream, colIndex) => {
                const globalIndex = rowIndex * 4 + colIndex;
                const isActive = rowIndex === focusedRow && colIndex === focusedCol;
                
                return (
                  <StreamTile
                    key={stream.id}
                    ref={(el) => {
                      if (!tileRefs.current[rowIndex]) {
                        tileRefs.current[rowIndex] = [];
                      }
                      tileRefs.current[rowIndex][colIndex] = el;
                    }}
                    id={stream.id}
                    title={stream.title}
                    thumbnail={stream.thumbnail}
                    streamId={stream.streamId}
                    streamUrl={stream.url}
                    size="regular"
                    variant="poster"
                    textPosition="below"
                    tabIndex={isActive ? 0 : -1}
                    onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
                    className="w-[220px] flex-shrink-0"
                  />
                );
              })}
              
              {/* Fill empty slots in incomplete rows */}
              {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, emptyIndex) => (
                <div key={`empty-${emptyIndex}`} className="w-[220px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}