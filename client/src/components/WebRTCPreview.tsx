import { useEffect, useRef, useState } from 'react';
import PreviewManager from '@/lib/PreviewManager';

interface WebRTCPreviewProps {
  streamUrl: string;
  streamId: string;
  isActive?: boolean;
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
  isActive = false,
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
  const previewManager = PreviewManager.getInstance();

  // Intersection Observer for lazy loading with stricter visibility
  const containerRef = useRef<HTMLDivElement>(null);
  const disconnectTimeoutRef = useRef<number>();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyVisible = entry.isIntersecting && entry.intersectionRatio > 0.5; // More restrictive - at least 50% visible
        setIsVisible(isCurrentlyVisible);
        
        // Disconnect stream if not visible for 5 seconds to save resources
        if (!isCurrentlyVisible) {
          // Clear any existing disconnect timeout first
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
          }
          
          // Capture current SDK reference to prevent race conditions
          const currentSdk = sdkRef.current;
          
          disconnectTimeoutRef.current = window.setTimeout(() => {
            // Only close if this is still the same SDK instance
            if (sdkRef.current === currentSdk && currentSdk) {
              console.log(`Disconnecting stream ${streamId} due to invisibility`);
              try {
                currentSdk.close();
              } catch (error) {
                console.warn('Error closing WebRTC preview:', error);
              }
              // Clear frame update interval and reset ref
              if (frameUpdateRef.current) {
                clearInterval(frameUpdateRef.current);
                frameUpdateRef.current = undefined;
              }
              // Detach media and reset state
              if (videoRef.current) {
                videoRef.current.srcObject = null;
              }
              sdkRef.current = null;
              setIsConnected(false);
            }
          }, 5000);
        } else {
          // Clear disconnect timeout if becomes visible again
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
            disconnectTimeoutRef.current = undefined;
          }
        }
      },
      { threshold: [0, 0.5] } // Monitor both entry/exit and 50% visibility
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      // Don't close SDK here - let the timeout handle it
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, [streamId]);

  // Separate cleanup for component unmount
  useEffect(() => {
    return () => {
      if (sdkRef.current) {
        try {
          sdkRef.current.close();
        } catch (error) {
          console.warn('Error closing WebRTC preview on unmount:', error);
        }
        sdkRef.current = null;
      }
    };
  }, []);

  // Function to capture frame from video and draw to canvas at reduced resolution
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Reduce resolution by 50% to lower processing load
        const targetWidth = Math.floor(video.videoWidth * 0.5);
        const targetHeight = Math.floor(video.videoHeight * 0.5);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Draw current video frame to canvas at reduced resolution
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      }
    }
  };

  useEffect(() => {
    if (!isVisible || !streamUrl || !isActive) return;

    const connectWebRTC = async () => {
      try {
        if (typeof SrsRtcWhipWhepAsync === 'undefined') {
          throw new Error('SRS SDK not loaded');
        }

        // Request preview slot from manager
        const releaseCallback = () => {
          console.log(`Force releasing WebRTC connection for ${streamId}`);
          if (sdkRef.current) {
            try {
              sdkRef.current.close();
            } catch (error) {
              console.warn('Error closing forced WebRTC connection:', error);
            }
            sdkRef.current = null;
            setIsConnected(false);
          }
        };

        // Try to get a slot first
        if (!previewManager.requestSlot(streamId, streamUrl, releaseCallback)) {
          // At capacity - try to force release oldest
          if (previewManager.forceReleaseOldest()) {
            // Try again after releasing oldest
            if (!previewManager.requestSlot(streamId, streamUrl, releaseCallback)) {
              console.log(`Could not get preview slot for ${streamId}, showing fallback`);
              return;
            }
          } else {
            console.log(`Preview manager at capacity, showing fallback for ${streamId}`);
            return;
          }
        }

        // Clear any pending disconnect timeout
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = undefined;
        }

        // Reuse existing connection if it's still active
        if (sdkRef.current && videoRef.current) {
          console.log(`Reusing existing connection for ${streamId}`);
          // Reattach the existing stream
          videoRef.current.srcObject = sdkRef.current.stream;
          
          // Restart frame capture if not already running
          if (!frameUpdateRef.current && sdkRef.current.stream) {
            const staggerDelay = (streamId.charCodeAt(0) % 10) * 300;
            setTimeout(() => {
              frameUpdateRef.current = window.setInterval(captureFrame, 3000);
              // Capture immediate frame for visual refresh
              captureFrame();
            }, 200 + staggerDelay);
          } else if (sdkRef.current.stream) {
            // Even if interval exists, capture a frame for immediate visual refresh
            captureFrame();
          }
          
          setIsConnected(true);
          setHasError(false);
          return;
        }

        // Close any existing connection before creating new one
        if (sdkRef.current) {
          try {
            sdkRef.current.close();
          } catch (error) {
            console.warn('Error closing existing WebRTC connection:', error);
          }
          // Clear frame update interval and reset ref
          if (frameUpdateRef.current) {
            clearInterval(frameUpdateRef.current);
            frameUpdateRef.current = undefined;
          }
          // Detach media
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }

        const sdk = SrsRtcWhipWhepAsync();
        sdkRef.current = sdk;

        if (videoRef.current) {
          videoRef.current.srcObject = sdk.stream;
          
          // When video starts playing, begin frame capture
          videoRef.current.onloadeddata = () => {
            setIsConnected(true);
            setHasError(false);
            
            // Stagger frame capture timing based on stream ID to avoid simultaneous updates
            const staggerDelay = (streamId.charCodeAt(0) % 10) * 300; // 0-2.7 second stagger
            const captureInterval = 3000; // Capture every 3 seconds
            
            // Start the interval after the stagger delay to maintain timing offset
            setTimeout(() => {
              frameUpdateRef.current = window.setInterval(captureFrame, captureInterval);
              // Capture initial frame immediately when starting
              captureFrame();
            }, 200 + staggerDelay);
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
      
      // Release preview slot when component unmounts or loses focus/visibility
      previewManager.releaseSlot(streamId);
      
      // Clear frame update interval and reset ref
      if (frameUpdateRef.current) {
        clearInterval(frameUpdateRef.current);
        frameUpdateRef.current = undefined;
      }
      
      // Don't close SDK here - handled by separate unmount cleanup
      setIsConnected(false);
    };
  }, [isVisible, streamUrl, streamId, isActive]);

  if (hasError || !isVisible || !isActive) {
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