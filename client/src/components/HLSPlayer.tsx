import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [currentQuality, setCurrentQuality] = useState<{ level: number; height?: number; bitrate?: number } | null>(null);
  const [availableQualityLevels, setAvailableQualityLevels] = useState<Array<{ level: number; height?: number; bitrate?: number; width?: number }>>([]);
  const [currentBandwidth, setCurrentBandwidth] = useState<number>(0);
  const [isAutoQuality, setIsAutoQuality] = useState(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 10; // Increased for live streams
  const globalAutoplayUnlockedRef = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastPlaybackTimeRef = useRef<number>(0);
  const stallCountRef = useRef(0);
  const maxStallsBeforeReconnect = 3;

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

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = undefined;
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
    stallCountRef.current = 0;
    lastPlaybackTimeRef.current = 0;
  }, [streamId]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(() => {
    // For live streams, reset retry count after max is reached to allow infinite recovery
    if (retryCountRef.current >= maxRetries) {
      console.log(`HLSPlayer[${streamId}]: Max retries reached, resetting counter for live stream recovery`);
      retryCountRef.current = 0;
      
      // Wait longer before starting fresh retry cycle
      retryTimeoutRef.current = setTimeout(() => {
        cleanup();
        setTimeout(() => connectToHLSStream(), 1000);
      }, 15000); // 15 second pause before fresh retry cycle
      return;
    }

    retryCountRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000); // Max 10s delay
    
    console.log(`HLSPlayer[${streamId}]: Retrying connection in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      connectToHLSStream();
    }, delay);
  }, [streamId, cleanup]);

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

        // Minimal config - let hls.js use defaults
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          // Live stream settings
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          // More tolerant buffer handling
          maxBufferHole: 0.5,
          // Retry settings
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4
        });

        hlsRef.current = hls;

        // HLS.js event handlers
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log(`HLSPlayer[${streamId}]: HLS manifest parsed successfully`);
          
          // Extract available quality levels
          const levels = data.levels?.map((level: any, index: number) => ({
            level: index,
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            name: level.name || `${level.height}p`
          })) || [];
          
          setAvailableQualityLevels(levels);
          console.log(`HLSPlayer[${streamId}]: Available quality levels:`, levels);
          
          setIsLoading(false);
          setConnectionStatus('connected');
          onCanPlay?.();
          retryCountRef.current = 0; // Reset retry count on success
        });

        // Track quality level changes
        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const level = data.level;
          const levelDetails = hls.levels[level];
          
          setCurrentQuality({
            level,
            height: levelDetails?.height,
            bitrate: levelDetails?.bitrate
          });
          
          console.log(`HLSPlayer[${streamId}]: Quality switched to level ${level} (${levelDetails?.height}p, ${Math.round((levelDetails?.bitrate || 0) / 1000)}kbps)`);
        });

        // Monitor bandwidth changes
        hls.on(Hls.Events.FRAG_LOADED, (event, data: any) => {
          if (data.stats?.bandwidth) {
            setCurrentBandwidth(data.stats.bandwidth);
          }
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error(`HLSPlayer[${streamId}]: HLS.js error:`, data.type, data.details, data);
          
          const hlsError = analyzeHLSError(data);
          setHlsError(hlsError);
          
          // Handle specific recoverable errors
          const isBufferError = data.details?.includes('BUFFER');
          const isDemuxerError = data.details?.includes('DEMUXER') || data.details?.includes('PARSE');
          const isFragError = data.details?.includes('FRAG');
          
          if (data.fatal) {
            console.error(`HLSPlayer[${streamId}]: Fatal HLS error - type: ${data.type}, details: ${data.details}`);
            setConnectionStatus('failed');
            setIsLoading(false);
            onError?.(hlsError.message);
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log(`HLSPlayer[${streamId}]: Network error, attempting recovery`);
                retryConnection();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`HLSPlayer[${streamId}]: Media error, attempting recoverMediaError()`);
                try {
                  hls.recoverMediaError();
                  setConnectionStatus('connecting');
                  setIsLoading(true);
                } catch (recoveryError) {
                  console.error(`HLSPlayer[${streamId}]: recoverMediaError failed, trying swapAudioCodec`);
                  try {
                    hls.swapAudioCodec();
                    hls.recoverMediaError();
                    setConnectionStatus('connecting');
                    setIsLoading(true);
                  } catch (swapError) {
                    console.error(`HLSPlayer[${streamId}]: All recovery failed:`, swapError);
                    retryConnection();
                  }
                }
                break;
              case Hls.ErrorTypes.MUX_ERROR:
                // Demuxer/muxer errors - destroy and fully reconnect
                console.log(`HLSPlayer[${streamId}]: Mux error (likely demuxer parse), forcing full reconnect`);
                cleanup();
                setTimeout(() => connectToHLSStream(), 2000);
                break;
              default:
                console.log(`HLSPlayer[${streamId}]: Fatal error, retrying connection`);
                retryConnection();
                break;
            }
          } else {
            // Non-fatal errors - log but try soft recovery
            console.warn(`HLSPlayer[${streamId}]: Non-fatal HLS error: ${data.details}`);
            
            // For demuxer/buffer errors, try to skip to live edge
            if (isDemuxerError || isBufferError || isFragError) {
              console.log(`HLSPlayer[${streamId}]: Attempting soft recovery for ${data.details}`);
              try {
                // Try to recover by seeking to live edge
                if (video.buffered.length > 0) {
                  const liveEdge = video.buffered.end(video.buffered.length - 1);
                  video.currentTime = liveEdge - 0.5;
                }
              } catch (seekError) {
                console.warn(`HLSPlayer[${streamId}]: Soft recovery seek failed:`, seekError);
              }
            }
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

  // Handle mute changes - sync video element with isMuted prop
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      // Only unmute after video starts playing
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;
      console.log(`HLSPlayer[${streamId}]: Mute changed - muted=${isMuted}, volume=${isMuted ? 0 : 1}`);
    }
  }, [isMuted, isPlaying, streamId]);

  // Health check - detect stalls and silent failures for long-running streams
  useEffect(() => {
    if (connectionStatus !== 'connected' || !isPlaying) {
      // Clear health check if not connected or not playing
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = undefined;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    console.log(`HLSPlayer[${streamId}]: Starting health check monitoring`);
    lastPlaybackTimeRef.current = video.currentTime;
    stallCountRef.current = 0;

    // Reset retry count after 2 minutes of healthy playback
    const resetRetryCountAfterHealthy = () => {
      if (retryCountRef.current > 0) {
        console.log(`HLSPlayer[${streamId}]: Stream healthy, resetting retry count`);
        retryCountRef.current = 0;
      }
    };

    // Check every 5 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      if (!video || video.paused) return;

      const currentTime = video.currentTime;
      const timeDiff = currentTime - lastPlaybackTimeRef.current;
      
      // Check if playback position has advanced
      if (timeDiff < 0.5) {
        // Playback stalled
        stallCountRef.current += 1;
        console.warn(`HLSPlayer[${streamId}]: Playback stall detected (count: ${stallCountRef.current}/${maxStallsBeforeReconnect})`);
        
        if (stallCountRef.current >= maxStallsBeforeReconnect) {
          console.error(`HLSPlayer[${streamId}]: Multiple stalls detected, forcing reconnect`);
          stallCountRef.current = 0;
          
          // Force full reconnect
          cleanup();
          setTimeout(() => connectToHLSStream(), 2000);
        } else {
          // Try to recover by seeking slightly forward (live stream trick)
          if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            if (bufferedEnd > currentTime + 1) {
              console.log(`HLSPlayer[${streamId}]: Attempting seek recovery to ${bufferedEnd - 0.5}`);
              video.currentTime = bufferedEnd - 0.5;
            }
          }
        }
      } else {
        // Playback is progressing normally
        stallCountRef.current = 0;
        lastPlaybackTimeRef.current = currentTime;
        resetRetryCountAfterHealthy();
      }
    }, 5000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = undefined;
      }
    };
  }, [connectionStatus, isPlaying, streamId, cleanup]);

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
          
          // After successful autoplay, restore audio based on isMuted state
          if (!isMuted) {
            video.muted = false;
            video.volume = 1;
            console.log(`HLSPlayer[${streamId}]: Audio restored after autoplay success`);
          }
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
  }, [connectionStatus, streamId, isPlaying, isMuted]);

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

  return (
    <div className={cn("relative bg-black overflow-hidden rounded-lg", className)}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        muted={isMuted}
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

      {/* Center play button when needs user interaction (autoplay blocked) */}
      {needsUserInteraction && !isPlaying && connectionStatus === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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