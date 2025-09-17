import { useState } from 'react';
import { Video, Users, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Studio {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  status: 'online' | 'offline' | 'maintenance';
  feedCount: number;
}

interface StudioCardProps {
  studio: Studio;
  onClick?: (studioId: string) => void;
  className?: string;
}

export default function StudioCard({ studio, onClick, className }: StudioCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onClick?.(studio.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const getStatusColor = (status: Studio['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-400 bg-green-400/10';
      case 'offline':
        return 'text-red-400 bg-red-400/10';
      case 'maintenance':
        return 'text-yellow-400 bg-yellow-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: Studio['status']) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4" />;
      case 'offline':
        return <Video className="w-4 h-4 opacity-50" />;
      case 'maintenance':
        return <Users className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-all duration-300 rounded-lg overflow-hidden group focus-visible:ring-4 focus-visible:ring-primary focus-visible:outline-none shadow-lg hover:shadow-2xl hover:shadow-primary/20",
        "w-80 h-48 bg-card",
        isHovered && "scale-105 z-10 shadow-2xl shadow-primary/30",
        className
      )}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`studio-card-${studio.id}`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${studio.thumbnail}")`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
      </div>

      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
          getStatusColor(studio.status)
        )}>
          {getStatusIcon(studio.status)}
          <span className="capitalize">{studio.status}</span>
        </div>
      </div>

      {/* Feed Count Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white bg-black/50 backdrop-blur-sm">
          <Video className="w-3 h-3" />
          <span>{studio.feedCount} feeds</span>
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-primary transition-colors">
          {studio.name}
        </h3>
        <p className="text-gray-300 text-sm line-clamp-2">
          {studio.description}
        </p>
      </div>

      {/* Hover Overlay */}
      <div className={cn(
        "absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300",
        isHovered && "opacity-100"
      )} />
    </div>
  );
}

export type { Studio };