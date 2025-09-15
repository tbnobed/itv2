import { useEffect, useRef, useState } from 'react';

interface WebRTCPreviewProps {
  streamUrl: string;
  streamId: string;
  className?: string;
  fallbackImage?: string;
}

declare global {
  function SrsRtcWhipWhepAsync(): {
    play: (url: string, options?: { videoOnly?: boolean; audioOnly?: boolean }) => Promise<{ sessionid: string; simulator: string }>;
    close: () => void;
    stream: MediaStream;
    pc: RTCPeerConnection;
  };
}

export default function WebRTCPreview({ 
  streamUrl, 
  streamId, 
  className = '',
  fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk9CVFYgTG9nbzwvdGV4dD48L3N2Zz4='
}: WebRTCPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sdkRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer for lazy loading
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !streamUrl) return;

    const connectWebRTC = async () => {
      try {
        if (typeof SrsRtcWhipWhepAsync === 'undefined') {
          throw new Error('SRS SDK not loaded');
        }

        const sdk = SrsRtcWhipWhepAsync();
        sdkRef.current = sdk;

        if (videoRef.current) {
          videoRef.current.srcObject = sdk.stream;
        }

        await sdk.play(streamUrl, {
          videoOnly: true, // Audio off for previews
          audioOnly: false
        });

        setIsConnected(true);
        setHasError(false);

      } catch (error) {
        console.warn(`WebRTC preview failed for ${streamId}:`, error);
        setHasError(true);
        setIsConnected(false);
      }
    };

    const timeoutId = setTimeout(connectWebRTC, Math.random() * 1000); // Stagger connections

    return () => {
      clearTimeout(timeoutId);
      if (sdkRef.current) {
        try {
          sdkRef.current.close();
        } catch (error) {
          console.warn('Error closing WebRTC preview:', error);
        }
        sdkRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isVisible, streamUrl, streamId]);

  if (hasError || !isVisible) {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <img
          src={fallbackImage}
          alt={`Stream ${streamId}`}
          className="w-full h-full object-cover bg-card"
          data-testid={`img-thumbnail-${streamId}`}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+';
          }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover bg-card transition-opacity duration-300 ${
          isConnected ? 'opacity-100' : 'opacity-0'
        }`}
        autoPlay
        muted
        playsInline
        data-testid={`webrtc-preview-${streamId}`}
      />
      {!isConnected && (
        <div className="absolute inset-0 bg-card flex items-center justify-center">
          <div className="text-gray-400 text-xs">Connecting...</div>
        </div>
      )}
    </div>
  );
}