import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, AlertCircle, Wifi, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Hls from 'hls.js';

interface HLSPlayerProps {
  streamUrl: string;
  streamId: string;
  streamTitle: string;
  isMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  className?: string;
}

interface HLSError {
  type: 'network' | 'media' | 'mux' | 'other' | 'unknown';
  message: string;
  details?: string;
  suggestion?: string;
  fatal?: boolean;
}

export default function HLSPlayer({
  streamUrl,
  streamId,
  streamTitle,
  isMuted,
  onMutedChange,
  onError,
  onLoadStart,
  onCanPlay,
  className = ''
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hlsError, setHlsError] = useState<HLSError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [isHlsSupported, setIsHlsSupported] = useState(false);
  const [useNativeHls, setUseNativeHls] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const globalAutoplayUnlockedRef = useRef(false);

  // Check HLS support
  useEffect(() => {
    const video = videoRef.current;
    console.log(`HLSPlayer[${streamId}]: HLS support check - video element exists: ${!!video}`);
    
    if (video) {
      // Safari has native HLS support
      const nativeHlsSupport = video.canPlayType('application/vnd.apple.mpegurl') !== '';
      setUseNativeHls(nativeHlsSupport);
      
      // Check if hls.js is loaded and supported
      const hlsJsSupport = Hls && Hls.isSupported();
      const finalSupport = nativeHlsSupport || hlsJsSupport;
      setIsHlsSupported(finalSupport);
      
      console.log(`HLSPlayer[${streamId}]: HLS support detection complete - native: ${nativeHlsSupport}, hls.js: ${hlsJsSupport}, Hls imported: ${!!Hls}, final: ${finalSupport}`);
    } else {
      console.log(`HLSPlayer[${streamId}]: Video element not ready, HLS support remains false`);
      setIsHlsSupported(false);
    }
  }, [streamId]);
  
  // Re-check HLS support when video element is ready
  const handleVideoReady = useCallback(() => {
    console.log(`HLSPlayer[${streamId}]: Video element ready, re-checking HLS support`);
    const video = videoRef.current;
    if (video) {
      const nativeHlsSupport = video.canPlayType('application/vnd.apple.mpegurl') !== '';
      setUseNativeHls(nativeHlsSupport);
      
      const hlsJsSupport = Hls && Hls.isSupported();
      const finalSupport = nativeHlsSupport || hlsJsSupport;
      setIsHlsSupported(finalSupport);
      
      console.log(`HLSPlayer[${streamId}]: HLS support re-detection complete - native: ${nativeHlsSupport}, hls.js: ${hlsJsSupport}, Hls imported: ${!!Hls}, final: ${finalSupport}`);
    }
  }, [streamId]);

  // Analyze HLS errors
  const analyzeHLSError = useCallback((error: any): HLSError => {
    if (!error) {
      return { type: 'unknown', message: 'Unknown HLS error' };
    }

    const errorType = error.type || 'unknown';
    const errorDetails = error.details || '';
    const errorMessage = error.message || error.toString();

    switch (errorType) {
      case 'networkError':
      case 'NETWORK_ERROR':
        return {
          type: 'network',
          message: 'Network connection error',
          details: errorDetails,
          suggestion: 'Check your internet connection and stream availability',
          fatal: error.fatal
        };
      case 'mediaError':
      case 'MEDIA_ERROR':
        return {
          type: 'media',
          message: 'Media decoding error',
          details: errorDetails,
          suggestion: 'Stream format may be unsupported or corrupted',
          fatal: error.fatal
        };
      case 'muxError':
      case 'MUX_ERROR':
        return {
          type: 'mux',
          message: 'Stream parsing error',
          details: errorDetails,
          suggestion: 'Stream manifest may be invalid',
          fatal: error.fatal
        };
      default:
        return {
          type: 'other',
          message: errorMessage || 'HLS playback error',
          details: errorDetails,
          suggestion: 'Try refreshing or contact support',
          fatal: error.fatal
        };
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log(`HLSPlayer[${streamId}]: Cleaning up`);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (error) {
        console.warn(`HLSPlayer[${streamId}]: Error destroying hls.js instance:`, error);
      }
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }

    setIsLoading(false);
    setIsPlaying(false);
    setConnectionStatus('idle');
    setHlsError(null);
    retryCountRef.current = 0;
  }, [streamId]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      console.log(`HLSPlayer[${streamId}]: Max retries reached, giving up`);
      setConnectionStatus('failed');
      setHlsError({
        type: 'network',
        message: 'Maximum retry attempts exceeded',
        suggestion: 'Please check the stream URL and try again later'
      });
      return;
    }

    retryCountRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000); // Max 10s delay
    
    console.log(`HLSPlayer[${streamId}]: Retrying connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      connectToHLSStream();
    }, delay);
  }, [streamId]);

  // Connect to HLS stream
  const connectToHLSStream = useCallback(async (): Promise<(() => void) | undefined> => {
    const video = videoRef.current;
    if (!video || !streamUrl || !isHlsSupported) {
      console.log(`HLSPlayer[${streamId}]: Cannot connect - missing video element or unsupported HLS`);
      return undefined;
    }

    console.log(`HLSPlayer[${streamId}]: Connecting to HLS stream: ${streamUrl}`);
    setIsLoading(true);
    setConnectionStatus('connecting');
    setHlsError(null);
    onLoadStart?.();

    try {
      if (useNativeHls) {
        // Use native HLS support (Safari)
        console.log(`HLSPlayer[${streamId}]: Using native HLS support`);
        
        video.src = streamUrl;
        video.muted = isMuted;
        
        // Set up event handlers for native video
        const handleCanPlay = () => {
          console.log(`HLSPlayer[${streamId}]: Native HLS can play`);
          setIsLoading(false);
          setConnectionStatus('connected');
          setIsPlaying(false); // Will be true when actually playing
          onCanPlay?.();
          retryCountRef.current = 0; // Reset retry count on success
        };

        const handlePlay = () => {
          setIsPlaying(true);
        };

        const handlePause = () => {
          setIsPlaying(false);
        };

        const handleError = (e: Event) => {
          const error = (e.target as HTMLVideoElement)?.error;
          console.error(`HLSPlayer[${streamId}]: Native HLS error:`, error);
          
          const hlsError = analyzeHLSError(error);
          setHlsError(hlsError);
          setConnectionStatus('failed');
          setIsLoading(false);
          onError?.(hlsError.message);
          
          // Retry on non-fatal errors
          if (!hlsError.fatal) {
            retryConnection();
          }
        };

        const handleLoadStart = () => {
          console.log(`HLSPlayer[${streamId}]: Native HLS load started`);
        };

        const handleWaiting = () => {
          setIsLoading(true);
        };

        const handlePlaying = () => {
          setIsLoading(false);
        };

        // Add event listeners
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        // Cleanup function for event listeners
        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadstart', handleLoadStart);
          video.removeEventListener('waiting', handleWaiting);
          video.removeEventListener('playing', handlePlaying);
        };

      } else if (Hls?.isSupported()) {
        // Use hls.js for browsers without native support
        console.log(`HLSPlayer[${streamId}]: Using hls.js`);
        
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          liveDurationInfinity: false,
          enableSoftwareAES: true
        });

        hlsRef.current = hls;

        // HLS.js event handlers
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log(`HLSPlayer[${streamId}]: HLS manifest parsed successfully`);
          setIsLoading(false);
          setConnectionStatus('connected');
          onCanPlay?.();
          retryCountRef.current = 0; // Reset retry count on success
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error(`HLSPlayer[${streamId}]: HLS.js error:`, data);
          
          const hlsError = analyzeHLSError(data);
          setHlsError(hlsError);
          
          if (data.fatal) {
            console.error(`HLSPlayer[${streamId}]: Fatal HLS error`);
            setConnectionStatus('failed');
            setIsLoading(false);
            onError?.(hlsError.message);
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log(`HLSPlayer[${streamId}]: Network error, attempting recovery`);
                retryConnection();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`HLSPlayer[${streamId}]: Media error, attempting recovery`);
                try {
                  hls.recoverMediaError();
                } catch (recoveryError) {
                  console.error(`HLSPlayer[${streamId}]: Recovery failed:`, recoveryError);
                  retryConnection();
                }
                break;
              default:
                console.log(`HLSPlayer[${streamId}]: Fatal error, retrying connection`);
                retryConnection();
                break;
            }
          } else {
            console.warn(`HLSPlayer[${streamId}]: Non-fatal HLS error, continuing playback`);
          }
        });

        // Video element event handlers for hls.js
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        video.muted = isMuted;

        // Cleanup function for hls.js
        return () => {
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('waiting', handleWaiting);
          video.removeEventListener('playing', handlePlaying);
        };

      } else {
        throw new Error('HLS is not supported in this browser');
      }

    } catch (error) {
      console.error(`HLSPlayer[${streamId}]: Connection error:`, error);
      
      const hlsError = analyzeHLSError(error);
      setHlsError(hlsError);
      setConnectionStatus('failed');
      setIsLoading(false);
      onError?.(hlsError.message);
      retryConnection();
      return undefined;
    }
  }, [streamUrl, streamId, isMuted, isHlsSupported, useNativeHls, analyzeHLSError, onLoadStart, onCanPlay, onError, retryConnection]);

  // Effect to handle stream connection
  useEffect(() => {
    console.log(`HLSPlayer[${streamId}]: Connection effect triggered. streamUrl=${streamUrl}, isHlsSupported=${isHlsSupported}`);
    
    if (streamUrl && isHlsSupported) {
      console.log(`HLSPlayer[${streamId}]: Initializing HLS connection to ${streamUrl}`);
      let cleanupFunction: (() => void) | undefined;
      
      connectToHLSStream().then((cleanup) => {
        cleanupFunction = cleanup;
      });
      
      return () => {
        console.log(`HLSPlayer[${streamId}]: Effect cleanup - cleaning up connection`);
        if (cleanupFunction && typeof cleanupFunction === 'function') {
          cleanupFunction();
        }
        cleanup();
      };
    } else {
      console.log(`HLSPlayer[${streamId}]: Cannot connect - streamUrl="${streamUrl}", isHlsSupported=${isHlsSupported}`);
      cleanup();
    }
  }, [streamUrl, isHlsSupported, streamId]);

  // Handle mute changes - but keep muted for autoplay
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      // Only unmute after video starts playing
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, isPlaying]);

  // Ultra-aggressive autoplay when connected
  useEffect(() => {
    if (connectionStatus === 'connected' && videoRef.current) {
      const video = videoRef.current;
      
      console.log(`HLSPlayer[${streamId}]: Starting ultra autoplay sequence`);
      
      // Ensure optimal autoplay settings
      video.muted = true;
      video.volume = 0;
      video.preload = 'auto';
      
      const tryAutoplay = async () => {
        try {
          console.log(`HLSPlayer[${streamId}]: Attempting autoplay...`);
          await video.play();
          console.log(`HLSPlayer[${streamId}]: AUTOPLAY SUCCESS!`);
          return true;
        } catch (error) {
          console.log(`HLSPlayer[${streamId}]: Autoplay failed:`, error);
          return false;
        }
      };
      
      // Method 1: Immediate play
      tryAutoplay();
      
      // Method 2: After 10ms
      setTimeout(tryAutoplay, 10);
      
      // Method 3: After 50ms  
      setTimeout(tryAutoplay, 50);
      
      // Method 4: After 100ms
      setTimeout(tryAutoplay, 100);
      
      // Method 5: After 200ms
      setTimeout(tryAutoplay, 200);
      
      // Method 6: After requestAnimationFrame
      requestAnimationFrame(() => {
        tryAutoplay();
      });
      
      // Method 7: Last resort after 1 second
      setTimeout(() => {
        if (!isPlaying) {
          console.log(`HLSPlayer[${streamId}]: Last resort autoplay attempt`);
          tryAutoplay().then((success) => {
            if (!success) {
              console.log(`HLSPlayer[${streamId}]: All autoplay methods exhausted`);
              setNeedsUserInteraction(true);
            }
          });
        }
      }, 1000);
    }
  }, [connectionStatus, streamId, isPlaying]);

  // Global autoplay unlock on any page interaction
  useEffect(() => {
    if (globalAutoplayUnlockedRef.current) return;

    const unlockAutoplay = () => {
      if (globalAutoplayUnlockedRef.current) return;
      
      console.log(`HLSPlayer[${streamId}]: User interaction detected - unlocking autoplay`);
      globalAutoplayUnlockedRef.current = true;
      
      // Immediately try to play if video is connected
      if (connectionStatus === 'connected' && videoRef.current && !isPlaying) {
        const video = videoRef.current;
        video.muted = true;
        video.volume = 0;
        
        video.play().then(() => {
          console.log(`HLSPlayer[${streamId}]: INTERACTION-TRIGGERED AUTOPLAY SUCCESS!`);
          setNeedsUserInteraction(false);
          
          // After successful start, unmute if needed
          setTimeout(() => {
            if (!isMuted) {
              video.muted = false;
              video.volume = 1;
            }
          }, 500);
        }).catch((error) => {
          console.log(`HLSPlayer[${streamId}]: Interaction-triggered play failed:`, error);
        });
      }
    };

    const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown', 'touchend'];
    
    // Add listeners for any user interaction
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, unlockAutoplay, { once: false, capture: true, passive: true });
    });

    return () => {
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, unlockAutoplay, { capture: true });
      });
    };
  }, [streamId, connectionStatus, isPlaying, isMuted]);

  // Keyboard navigation support for Fire TV
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          if (isPlaying) {
            video.pause();
          } else {
            video.play().catch(console.error);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          onMutedChange(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          onMutedChange(true);
          break;
      }
    };

    video.addEventListener('keydown', handleKeyDown);
    return () => video.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onMutedChange]);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      setNeedsUserInteraction(false);
      video.play().catch((error) => {
        console.error(`HLSPlayer[${streamId}]: Play error:`, error);
      });
    }
  };

  const handleToggleMute = () => {
    onMutedChange(!isMuted);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Wifi className="w-4 h-4 animate-pulse" />;
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (hlsError) {
      return `Error: ${hlsError.message}`;
    }
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to HLS stream...';
      case 'connected':
        return isLoading ? 'Buffering...' : (isPlaying ? 'Playing HLS Stream' : 'Ready to Play');
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Initializing HLS Player';
    }
  };

  return (
    <div className={cn("relative bg-black overflow-hidden rounded-lg", className)}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        muted={true}
        autoPlay={true}
        data-testid={`hls-video-${streamId}`}
        tabIndex={0}
        style={{ outline: 'none' }}
        onLoadedMetadata={handleVideoReady}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            <span>Loading HLS stream...</span>
          </div>
        </div>
      )}

      {/* Control overlay - always visible when needs user interaction or on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50 transition-opacity duration-300",
        needsUserInteraction || !isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
      )}>
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-black/70 text-white">
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              <span className="text-xs">{useNativeHls ? 'Native HLS' : 'HLS.js'}</span>
            </div>
          </Badge>
        </div>

        {/* Center play button when needs user interaction */}
        {needsUserInteraction && !isPlaying && connectionStatus === 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={handleTogglePlay}
              className="bg-white/90 text-black hover:bg-white font-semibold px-8 py-4"
              data-testid={`button-hls-play-center-${streamId}`}
            >
              <Play className="w-6 h-6 mr-2" />
              Click to Play
            </Button>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTogglePlay}
                className="text-white hover:bg-white/20"
                data-testid={`button-hls-play-${streamId}`}
              >
                <Play className={cn("w-4 h-4", isPlaying && "hidden")} />
                <span className={cn("w-4 h-4", !isPlaying && "hidden")}>⏸</span>
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleMute}
                className="text-white hover:bg-white/20"
                data-testid={`button-hls-mute-${streamId}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>

            <div className="text-sm text-white/80">
              {getStatusText()}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {hlsError && connectionStatus === 'failed' && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-red-900/90 text-white p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-red-200">HLS Playback Error</h4>
              <p className="text-sm text-red-300 mt-1">{hlsError.message}</p>
              {hlsError.suggestion && (
                <p className="text-xs text-red-400 mt-2">{hlsError.suggestion}</p>
              )}
              {retryCountRef.current > 0 && retryCountRef.current < maxRetries && (
                <p className="text-xs text-red-400 mt-2">
                  Retry attempt {retryCountRef.current}/{maxRetries}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HLS Not Supported overlay */}
      {!isHlsSupported && connectionStatus === 'idle' && (
        <div className="absolute inset-0 bg-gray-900/95 flex items-center justify-center">
          <div className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">HLS Not Supported</h3>
            <p className="text-gray-300 text-sm">
              Your browser doesn't support HLS streaming. Please use a compatible browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}