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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sdkRef = useRef<any>(null);
  const frameUpdateRef = useRef<number>();
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

  // Function to capture frame from video and draw to canvas
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
  };

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
          
          // When video starts playing, begin frame capture
          videoRef.current.onloadeddata = () => {
            setIsConnected(true);
            setHasError(false);
            
            // Start capturing frames every 1 second
            frameUpdateRef.current = window.setInterval(captureFrame, 1000);
            
            // Capture initial frame immediately
            setTimeout(captureFrame, 100);
          };
        }

        await sdk.play(streamUrl, {
          videoOnly: true, // Audio off for previews
          audioOnly: false
        });

      } catch (error) {
        console.warn(`WebRTC preview failed for ${streamId}:`, error);
        setHasError(true);
        setIsConnected(false);
      }
    };

    const timeoutId = setTimeout(connectWebRTC, Math.random() * 1000); // Stagger connections

    return () => {
      clearTimeout(timeoutId);
      
      // Clear frame update interval
      if (frameUpdateRef.current) {
        clearInterval(frameUpdateRef.current);
      }
      
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
      {/* Hidden video element for frame capture */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        autoPlay
        muted
        playsInline
        style={{ width: '1px', height: '1px' }}
      />
      
      {/* Canvas to display static frames */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover bg-card transition-opacity duration-300 ${
          isConnected ? 'opacity-100' : 'opacity-0'
        }`}
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