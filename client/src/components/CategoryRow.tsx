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

      {/* Android TV Grid Layout */}
      <div className="w-full px-8" data-testid="grid-container">
        <div className={cn(
          "grid gap-6 pb-8",
          featured 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" // Featured items get more space
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" // Regular items are more compact
        )}>
          {streams.map((stream) => (
            <div key={stream.id} className="flex justify-center">
              <StreamTile
                id={stream.id}
                title={stream.title}
                thumbnail={stream.thumbnail}
                streamId={stream.streamId}
                streamUrl={stream.url}
                size={featured ? 'featured' : 'regular'}
                onSelect={() => onStreamSelect?.(stream.streamId, stream.url)}
                className=""
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}