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
}

export default function StreamGrid({ 
  title, 
  streams, 
  onStreamSelect,
  className 
}: StreamGridProps) {
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const tileRefs = useRef<(HTMLDivElement | null)[][]>([]);
  
  // Group streams into rows of 8
  const streamRows: StreamData[][] = [];
  for (let i = 0; i < streams.length; i += 8) {
    streamRows.push(streams.slice(i, i + 8));
  }

  // Initialize tile refs array
  useEffect(() => {
    tileRefs.current = streamRows.map(row => new Array(row.length).fill(null));
  }, [streamRows.length]);

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
    <div className={cn("w-full", className)}>
      {/* Section Title */}
      <h2 
        className="text-white font-bold text-2xl mb-6 px-8 text-center"
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
      </h2>

      {/* 8-Column Grid - No Scrolling */}
      <div className="w-full px-8" onKeyDown={handleKeyDown}>
        <div className="flex flex-col gap-4">
          {streamRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-8 gap-2 w-full">
              {row.map((stream, colIndex) => {
                const globalIndex = rowIndex * 8 + colIndex;
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
                    tabIndex={isActive ? 0 : -1}
                    onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
                    className="w-[110px] flex-shrink-0"
                  />
                );
              })}
              
              {/* Fill empty slots in incomplete rows */}
              {row.length < 8 && Array.from({ length: 8 - row.length }).map((_, emptyIndex) => (
                <div key={`empty-${emptyIndex}`} className="w-[110px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}