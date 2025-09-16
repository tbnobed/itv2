import { cn } from '@/lib/utils';
import StreamTile from './StreamTile';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
  category: string;
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
  if (!streams.length) return null;

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

      {/* Android TV Horizontal Scroll Layout */}
      <div className="w-full" data-testid="scroll-container">
        <div className="overflow-x-auto overflow-y-hidden scrollbar-hide px-8">
          <div className="flex gap-6 pb-8 w-max">
            {streams.map((stream) => (
              <StreamTile
                key={stream.id}
                id={stream.id}
                title={stream.title}
                thumbnail={stream.thumbnail}
                streamId={stream.streamId}
                streamUrl={stream.url}
                size={featured ? 'featured' : 'regular'}
                onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
                className="flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}