import { useState, useEffect, useRef } from 'react';
import PreviewManager from '@/lib/PreviewManager';

interface SnapshotPreviewProps {
  streamUrl: string;
  streamId: string;
  className?: string;
  fallbackImage?: string;
}

export default function SnapshotPreview({ 
  streamUrl, 
  streamId, 
  className = '',
  fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk9CVFYgTG9nbzwvdGV4dD48L3N2Zz4='
}: SnapshotPreviewProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState<string>(fallbackImage);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewManager = PreviewManager.getInstance();

  // Intersection Observer for visibility tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyVisible = entry.isIntersecting && entry.intersectionRatio > 0.1; // 10% visible
        setIsVisible(isCurrentlyVisible);
      },
      { threshold: [0, 0.1] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Register/unregister with snapshot manager based on visibility
  useEffect(() => {
    if (!isVisible || !streamUrl) return;

    const handleSnapshot = (dataUrl: string) => {
      setCurrentSnapshot(dataUrl);
    };

    // Register for snapshots
    previewManager.registerStreamForSnapshot(streamId, streamUrl, handleSnapshot);

    return () => {
      // Unregister when not visible or unmounting
      previewManager.unregisterStreamFromSnapshot(streamId);
    };
  }, [isVisible, streamUrl, streamId]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <img
        src={currentSnapshot}
        alt={`Stream ${streamId}`}
        className="w-full h-full object-cover bg-card transition-opacity duration-500"
        data-testid={`snapshot-preview-${streamId}`}
        onError={(e) => {
          e.currentTarget.src = fallbackImage;
        }}
      />
      
      {/* Loading indicator when using fallback */}
      {currentSnapshot === fallbackImage && (
        <div className="absolute inset-0 bg-card/50 flex items-center justify-center">
          <div className="text-gray-400 text-xs">Loading preview...</div>
        </div>
      )}
    </div>
  );
}