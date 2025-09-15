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
    <div className={cn("relative mb-12 w-full", className)}>
      {/* Section Title */}
      <h2 
        className={cn(
          "text-white font-bold mb-4 px-6 text-center",
          featured ? "text-2xl" : "text-xl"
        )}
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
      </h2>

      {/* Grid Content */}
      <div className="w-full px-6" data-testid="grid-container">
        <div className={cn(
          "grid gap-6 justify-items-center",
          featured 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-8" 
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pb-4"
        )}>
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
              className=""
            />
          ))}
        </div>
      </div>
    </div>
  );
}