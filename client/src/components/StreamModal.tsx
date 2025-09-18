import { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Maximize, Minimize, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PreviewManager from '@/lib/PreviewManager';

// Declare global SRS SDK types
declare global {
  function SrsRtcWhipWhepAsync(): {
    play: (url: string, options?: { videoOnly?: boolean; audioOnly?: boolean }) => Promise<{ sessionid: string; simulator: string }>;
    close: () => void;
    stream: MediaStream;
    pc: RTCPeerConnection;
  };
  function SrsRtcFormatStats(stats: any, type: string): string;
}

interface StreamModalProps {
  isOpen: boolean;
  streamId: string;
  streamUrl: string;
  streamTitle: string;
  onClose: () => void;
}

interface ConnectionState {
  iceConnectionState: RTCIceConnectionState;
  connectionState: RTCPeerConnectionState;
  iceGatheringState: RTCIceGatheringState;
}

interface DetailedError {
  type: 'network' | 'cors' | 'https' | 'sdk' | 'webrtc' | 'server' | 'unknown';
  message: string;
  details?: string;
  suggestion?: string;
}

export default function StreamModal({ 
  isOpen, 
  streamId, 
  streamUrl, 
  streamTitle, 
  onClose 
}: StreamModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    iceConnectionState: 'new',
    connectionState: 'new',
    iceGatheringState: 'new'
  });
  const [detailedError, setDetailedError] = useState<DetailedError | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [sdkLoadError, setSDKLoadError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const srsPlayerRef = useRef<any>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Robust multi-frame focus restoration with retry logic
  const restoreFocus = () => {
    console.log('StreamModal: Attempting to restore focus...');
    
    const maxAttempts = 10;
    const maxTime = 400; // 400ms timeout
    const startTime = Date.now();
    let attempts = 0;
    
    const attemptRestore = () => {
      attempts++;
      const elapsed = Date.now() - startTime;
      
      // Check for timeout conditions
      if (attempts > maxAttempts || elapsed > maxTime) {
        console.warn('StreamModal: Focus restoration timed out after', attempts, 'attempts and', elapsed, 'ms');
        previouslyFocusedElement.current = null;
        return;
      }
      
      // Validate restore target - ignore invalid elements
      if (previouslyFocusedElement.current) {
        const element = previouslyFocusedElement.current;
        const isValidTarget = element &&
          element !== document.body &&
          element !== document.documentElement &&
          document.contains(element) &&
          typeof element.focus === 'function';
          
        if (isValidTarget) {
          try {
            console.log('StreamModal: Restoring focus to stored element (attempt', attempts, ')');
            element.focus();
            // Check if focus was actually set
            if (document.activeElement === element) {
              console.log('StreamModal: Focus restoration successful');
              previouslyFocusedElement.current = null;
              return;
            }
          } catch (error) {
            console.warn('StreamModal: Error focusing stored element:', error);
          }
        } else {
          console.log('StreamModal: Stored element invalid, using fallback');
          previouslyFocusedElement.current = null;
        }
      }
      
      // Broader fallback selectors - primary stream tiles
      const streamTileSelectors = [
        '.stream-tile[tabindex]',
        '.stream-tile',
        '[data-testid^="stream-tile-"]'
      ];
      
      for (const selector of streamTileSelectors) {
        const fallbackTile = document.querySelector(selector) as HTMLElement;
        if (fallbackTile && typeof fallbackTile.focus === 'function') {
          try {
            console.log('StreamModal: Fallback to stream tile with selector:', selector, '(attempt', attempts, ')');
            fallbackTile.focus();
            // Check if focus was actually set
            if (document.activeElement === fallbackTile) {
              console.log('StreamModal: Stream tile focus successful');
              previouslyFocusedElement.current = null;
              return;
            }
          } catch (error) {
            console.warn('StreamModal: Error focusing stream tile:', error);
          }
        }
      }
      
      // Secondary fallback - TopNavigation active button
      const navButton = document.querySelector('[data-testid^="nav-"][data-active="true"]') as HTMLElement;
      if (navButton && typeof navButton.focus === 'function') {
        try {
          console.log('StreamModal: Secondary fallback to nav button (attempt', attempts, ')');
          navButton.focus();
          // Check if focus was actually set
          if (document.activeElement === navButton) {
            console.log('StreamModal: Nav button focus successful');
            previouslyFocusedElement.current = null;
            return;
          }
        } catch (error) {
          console.warn('StreamModal: Error focusing nav button:', error);
        }
      }
      
      // If we get here, schedule another attempt
      console.log('StreamModal: Focus attempt', attempts, 'failed, retrying...');
      requestAnimationFrame(attemptRestore);
    };
    
    // Start the retry sequence
    requestAnimationFrame(attemptRestore);
  };

  // SDK Loading verification
  useEffect(() => {
    const checkSDKLoading = () => {
      if (typeof SrsRtcWhipWhepAsync !== 'undefined') {
        setIsSDKLoaded(true);
        setSDKLoadError(null);
      } else {
        setSDKLoadError('SRS SDK not loaded. Please refresh the page.');
        setIsSDKLoaded(false);
      }
    };

    // Check immediately
    checkSDKLoading();

    // Check again after a delay in case SDK is still loading
    const timeoutId = setTimeout(checkSDKLoading, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // SRS WebRTC connection management
  useEffect(() => {
    if (isOpen && streamUrl && isSDKLoaded) {
      connectToWebRTCStream();
    } else {
      disconnectStream();
    }

    return () => {
      disconnectStream();
    };
  }, [isOpen, streamUrl, isSDKLoaded]);

  // Clean up controls timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const analyzeError = (error: any): DetailedError => {
    const errorStr = error?.message || error?.toString() || 'Unknown error';
    
    // CORS errors
    if (errorStr.includes('CORS') || errorStr.includes('Cross-Origin') || errorStr.includes('blocked by CORS') || errorStr.includes('Access-Control')) {
      return {
        type: 'cors',
        message: 'Cross-origin request blocked',
        details: 'The WebRTC server does not allow connections from this domain.',
        suggestion: 'Ensure the server has CORS headers configured for your domain, or use HTTPS with schema=https parameter.'
      };
    }
    
    // HTTPS requirements
    if (errorStr.includes('HTTPS') || errorStr.includes('secure context') || errorStr.includes('getUserMedia')) {
      return {
        type: 'https',
        message: 'HTTPS required for WebRTC',
        details: 'WebRTC requires a secure context (HTTPS) for media access.',
        suggestion: 'Use HTTPS or add ?schema=https to your WebRTC URL for secure connections.'
      };
    }
    
    // Network/connection errors
    if (errorStr.includes('Network') || errorStr.includes('fetch') || errorStr.includes('timeout') || errorStr.includes('ERR_NETWORK')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        details: 'Unable to reach the WebRTC server.',
        suggestion: 'Check your internet connection and verify the server URL and port are correct.'
      };
    }
    
    // SDK errors
    if (errorStr.includes('SRS') || errorStr.includes('SDK') || errorStr.includes('not loaded')) {
      return {
        type: 'sdk',
        message: 'SRS SDK error',
        details: errorStr,
        suggestion: 'Try refreshing the page to reload the SRS SDK.'
      };
    }
    
    // Server errors (HTTP status codes)
    if (errorStr.includes('40') || errorStr.includes('50') || errorStr.includes('status') || errorStr.includes('code')) {
      return {
        type: 'server',
        message: 'Server error',
        details: errorStr,
        suggestion: 'The WebRTC server is experiencing issues. Try again later or contact support.'
      };
    }
    
    // WebRTC specific errors
    if (errorStr.includes('WebRTC') || errorStr.includes('RTC') || errorStr.includes('ICE') || errorStr.includes('peer') || errorStr.includes('offer') || errorStr.includes('answer')) {
      return {
        type: 'webrtc',
        message: 'WebRTC connection failed',
        details: errorStr,
        suggestion: 'Check firewall settings and ensure WebRTC ports are accessible.'
      };
    }
    
    return {
      type: 'unknown',
      message: 'Connection failed',
      details: errorStr,
      suggestion: 'Please check the URL format and try again. Contact support if the issue persists.'
    };
  };

  const connectToWebRTCStream = async () => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      setDetailedError(null);
      setConnectionStatus('connecting');
      setIsConnected(false);
      
      // CRITICAL: Suspend all preview activity for exclusive playback mode (prevents Firestick crashes)
      console.log('StreamModal: Suspending all preview activity for exclusive playback mode');
      PreviewManager.getInstance().suspendAll();
      
      // Reset connection state
      setConnectionState({
        iceConnectionState: 'new',
        connectionState: 'new',
        iceGatheringState: 'new'
      });
      
      console.log(`Connecting to stream: ${streamUrl}`);
      console.log('Connection state before:', connectionState);
      
      // Basic URL validation - allow HTTP, HTTPS, and WebRTC URLs
      if (!streamUrl.match(/^(https?|webrtc):\/\/.+/)) {
        throw new Error('Invalid stream URL format. Supported: http://, https://, or webrtc://');
      }

      // Check SDK availability
      if (!isSDKLoaded || typeof SrsRtcWhipWhepAsync === 'undefined') {
        throw new Error('SRS SDK not loaded. Please refresh the page and try again.');
      }

      const sdk = SrsRtcWhipWhepAsync();
      srsPlayerRef.current = sdk;
      
      // Set video source to the SDK stream
      if (videoRef.current) {
        videoRef.current.srcObject = sdk.stream;
      }

      // Enhanced RTCPeerConnection event logging
      if (sdk.pc) {
        sdk.pc.oniceconnectionstatechange = () => {
          const iceState = sdk.pc.iceConnectionState;
          console.log('ICE connection state changed:', iceState);
          setConnectionState(prev => ({ ...prev, iceConnectionState: iceState }));
          
          if (iceState === 'failed' || iceState === 'disconnected') {
            console.error('ICE connection failed/disconnected');
            setDetailedError({
              type: 'webrtc',
              message: 'WebRTC connection lost',
              details: `ICE connection state: ${iceState}`,
              suggestion: 'Check your network connection and firewall settings. WebRTC requires UDP access.'
            });
            setConnectionStatus('failed');
          } else if (iceState === 'connected' || iceState === 'completed') {
            console.log('ICE connection established successfully');
          }
        };

        sdk.pc.onconnectionstatechange = () => {
          const connState = sdk.pc.connectionState;
          console.log('Peer connection state changed:', connState);
          setConnectionState(prev => ({ ...prev, connectionState: connState }));
          
          if (connState === 'failed') {
            console.error('Peer connection failed');
            setDetailedError({
              type: 'webrtc',
              message: 'Peer connection failed',
              details: `Connection state: ${connState}`,
              suggestion: 'The WebRTC connection could not be established. Check network connectivity.'
            });
            setConnectionStatus('failed');
          } else if (connState === 'connected') {
            console.log('Peer connection established successfully');
            setIsConnected(true);
            setConnectionStatus('connected');
          }
        };

        sdk.pc.onicegatheringstatechange = () => {
          const gatheringState = sdk.pc.iceGatheringState;
          console.log('ICE gathering state changed:', gatheringState);
          setConnectionState(prev => ({ ...prev, iceGatheringState: gatheringState }));
        };

        sdk.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            console.log('ICE candidate:', event.candidate.candidate);
          } else {
            console.log('ICE gathering completed');
          }
        };
      }

      // Video element srcObject is already set to sdk.stream
      // No need for ontrack handler with SrsRtcWhipWhepAsync approach

      // Connect to the WebRTC stream with enhanced error handling
      console.log('Initiating WebRTC connection...');
      const session = await sdk.play(streamUrl, {
        videoOnly: false,
        audioOnly: false
      });
      
      console.log('WebRTC session established:', session);
      console.log('Final connection state:', connectionState);
      setIsLoading(false);
      
    } catch (error) {
      console.error('WebRTC connection failed:', error);
      console.log('Error details:', { error, connectionState });
      
      // CRITICAL: Resume preview activity if connection fails (restore Firestick stability)
      console.log('StreamModal: Resuming preview activity after connection failure');
      PreviewManager.getInstance().resumeSnapshots();
      
      const analyzedError = analyzeError(error);
      setDetailedError(analyzedError);
      setConnectionError(analyzedError.message);
      setConnectionStatus('failed');
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  const disconnectStream = () => {
    if (srsPlayerRef.current) {
      console.log('Disconnecting WebRTC stream');
      srsPlayerRef.current.close();
      srsPlayerRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Clear timeout to prevent memory leak
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // CRITICAL: Resume preview activity after exclusive playback ends (restore Firestick stability)
    console.log('StreamModal: Resuming preview activity after exclusive playback ended');
    PreviewManager.getInstance().resumeSnapshots();
    
    setIsLoading(false);
    setIsConnected(false);
    setConnectionError(null);
    setDetailedError(null);
    setConnectionStatus('idle');
    setConnectionState({
      iceConnectionState: 'new',
      connectionState: 'new',
      iceGatheringState: 'new'
    });
  };

  const retryConnection = () => {
    if (streamUrl) {
      connectToWebRTCStream();
    }
  };

  // Simplified - no history management needed for Fire TV

  // Track which element we made inert for proper cleanup
  const backgroundElRef = useRef<HTMLElement | null>(null);

  // Focus management - Capture focus when modal opens  
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      const activeElement = document.activeElement as HTMLElement;
      previouslyFocusedElement.current = activeElement;
      console.log('StreamModal: Captured focus element');
      
      // Focus the modal container
      if (modalRef.current) {
        modalRef.current.focus();
        console.log('StreamModal: Focused modal container');
      }
    }

    // Cleanup function to ensure focus is always restored
    return () => {
      console.log('StreamModal: Focus effect cleanup running');
    };
  }, [isOpen]);

  // Focus restoration when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('StreamModal: Modal closed, restoring focus...');
      // Simple, immediate focus restoration to first available stream tile
      const focusTarget = document.querySelector('.stream-tile, [data-testid^="stream-tile-"]') as HTMLElement;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        console.log('StreamModal: Focusing first stream tile immediately');
        focusTarget.focus();
      } else {
        console.log('StreamModal: No stream tiles found, focusing body');
        document.body.focus();
      }
    }
  }, [isOpen]);

  // Disabled auto-fullscreen for Fire TV compatibility
  // Fire TV handles back button differently in fullscreen vs windowed mode

  // Maintain focus on modal when entering/exiting fullscreen, but suppress during close
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Suppress re-focus during modal closure to prevent interference
      if (isClosing) {
        console.log('StreamModal: Suppressing fullscreen change re-focus during modal closure');
        return;
      }
      
      if (isOpen && modalRef.current) {
        // Re-focus modal after fullscreen change to ensure keyboard events work
        setTimeout(() => {
          if (modalRef.current && !isClosing) {
            modalRef.current.focus();
            console.log('StreamModal: Re-focused modal after fullscreen change');
          }
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isOpen, isClosing]);

  // Fire TV back button prevention - native event handler to prevent system exit
  useEffect(() => {
    if (!isOpen) return;
    
    const handleNativeKeyDown = (e: KeyboardEvent) => {
      const isBackButton = 
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'Back' ||
        e.key === 'BrowserBack' ||
        e.keyCode === 8 ||
        e.keyCode === 166 ||
        e.code === 'BrowserBack';

      if (isBackButton) {
        // Aggressively prevent Fire TV system handling
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('StreamModal: Prevented Fire TV system exit via native handler');
      }
    };

    document.addEventListener('keydown', handleNativeKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleNativeKeyDown, { capture: true });
  }, [isOpen]);

  // Simplified keyboard handling - scoped to modal, no global interference
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    console.log('StreamModal: Key pressed:', e.key, e.keyCode, e.code);
    
    // Handle multiple Fire TV back button variations
    const isBackButton = 
      e.key === 'Escape' ||
      e.key === 'Backspace' ||
      e.key === 'Back' ||
      e.key === 'BrowserBack' ||
      e.keyCode === 8 ||  // Backspace keyCode
      e.keyCode === 166 || // BrowserBack keyCode
      e.code === 'BrowserBack';

    if (isBackButton) {
      console.log('StreamModal: Back/Escape detected, closing modal');
      e.preventDefault();
      e.stopPropagation();
      handleModalClose();
      return;
    }

    // Only preventDefault for keys we actually handle
    switch (e.key) {
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
      case ' ':
        e.preventDefault();
        toggleMute();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        if (connectionStatus === 'failed') {
          retryConnection();
        }
        break;
      // Let arrow keys and other keys pass through normally - no preventDefault
    }
  };

  // Simple fullscreen handling only
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isOpen]);

  // Simplified modal close for Fire TV compatibility
  const handleModalClose = () => {
    // Set closing flag to suppress fullscreen re-focus during close
    setIsClosing(true);
    
    // Exit fullscreen if needed
    if (document.fullscreenElement) {
      console.log('StreamModal: Exiting fullscreen while closing modal...');
      document.exitFullscreen().catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
      setIsFullscreen(false);
    }
    
    // Always trigger focus restoration before closing
    console.log('StreamModal: Closing modal and will restore focus...');
    
    // IMMEDIATE focus restoration before any other logic
    console.log('StreamModal: Restoring focus immediately...');
    const focusTarget = document.querySelector('.stream-tile, [data-testid^="stream-tile-"]') as HTMLElement;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      console.log('StreamModal: Focusing first stream tile immediately');
      focusTarget.focus();
    } else {
      console.log('StreamModal: No stream tiles found, focusing body');
      document.body.focus();
    }
    
    // Close modal immediately - no complex history management
    onClose();
  };

  // Reset closing flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      console.log(`Audio ${newMutedState ? 'muted' : 'unmuted'}`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center outline-none"
      onClick={(e) => e.target === e.currentTarget && handleModalClose()}
      onMouseMove={handleMouseMove}
      onKeyDownCapture={handleModalKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Streaming ${streamTitle}`}
      data-testid="stream-modal"
    >
      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* WebRTC Video Element */}
        <video 
          ref={videoRef}
          className={cn(
            "w-full h-full object-contain bg-black",
            isConnected ? "block" : "hidden"
          )}
          autoPlay
          playsInline
          muted={isMuted}
          data-testid="video-player"
        />

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg">Connecting to stream...</p>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Wifi className="w-4 h-4" />
              <span>{streamUrl}</span>
            </div>
          </div>
        )}

        {/* SDK Loading Error */}
        {sdkLoadError && (
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-yellow-500" />
            <h3 className="text-white text-xl font-bold">SDK Loading Error</h3>
            <p className="text-gray-300 text-sm">{sdkLoadError}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-white"
              data-testid="button-reload-page"
            >
              Reload Page
            </Button>
          </div>
        )}

        {/* Enhanced Connection Error State */}
        {connectionError && connectionStatus === 'failed' && !sdkLoadError && (
          <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="space-y-2">
              <h3 className="text-white text-xl font-bold">Connection Failed</h3>
              {detailedError && (
                <div className="space-y-3">
                  <p className="text-gray-300 text-base">{detailedError.message}</p>
                  {detailedError.details && (
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-gray-400 text-sm font-medium mb-1">Technical Details:</p>
                      <p className="text-gray-300 text-sm font-mono break-all">{detailedError.details}</p>
                    </div>
                  )}
                  {detailedError.suggestion && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-blue-300 text-sm font-medium mb-1">Suggestion:</p>
                      <p className="text-blue-200 text-sm">{detailedError.suggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Connection State Debug Info */}
            <div className="bg-gray-900 rounded-lg p-4 w-full">
              <p className="text-gray-400 text-xs font-medium mb-2">Connection Diagnostics:</p>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Stream URL:</span>
                  <code className="text-gray-300 bg-gray-800 px-1 rounded break-all text-right max-w-xs">{streamUrl}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ICE State:</span>
                  <span className={`font-mono ${
                    connectionState.iceConnectionState === 'connected' || connectionState.iceConnectionState === 'completed' 
                      ? 'text-green-400' 
                      : connectionState.iceConnectionState === 'failed' || connectionState.iceConnectionState === 'disconnected'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}>{connectionState.iceConnectionState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Peer State:</span>
                  <span className={`font-mono ${
                    connectionState.connectionState === 'connected' 
                      ? 'text-green-400' 
                      : connectionState.connectionState === 'failed'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}>{connectionState.connectionState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ICE Gathering:</span>
                  <span className={`font-mono ${
                    connectionState.iceGatheringState === 'complete' 
                      ? 'text-green-400' 
                      : 'text-yellow-400'
                  }`}>{connectionState.iceGatheringState}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={retryConnection}
                className="bg-primary hover:bg-primary/90 text-white"
                data-testid="button-retry-connection"
              >
                Retry Connection
              </Button>
              {detailedError?.type === 'cors' || detailedError?.type === 'https' ? (
                <Button
                  onClick={() => {
                    const httpsUrl = streamUrl.includes('?') 
                      ? `${streamUrl}&schema=https` 
                      : `${streamUrl}?schema=https`;
                    console.log('Suggested HTTPS URL:', httpsUrl);
                    // Note: In a real implementation, this would update the parent component's streamUrl
                    alert(`Try this HTTPS URL: ${httpsUrl}`);
                  }}
                  variant="outline"
                  className="text-white border-white"
                  data-testid="button-try-https"
                >
                  Try HTTPS
                </Button>
              ) : null}
            </div>
            <p className="text-gray-500 text-xs">Press R to retry or ESC to close</p>
          </div>
        )}

        {/* This overlay was causing the persistent status display - now removed */}

        {/* Controls Overlay */}
        <div 
          className={cn(
            "absolute inset-0 transition-opacity duration-300 pointer-events-none",
            showControls || isLoading || connectionError ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {connectionStatus === 'connected' && (
                  <Badge className="bg-green-500 text-white">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                    LIVE
                  </Badge>
                )}
                {connectionStatus === 'connecting' && (
                  <Badge className="bg-yellow-500 text-white">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                    CONNECTING
                  </Badge>
                )}
                {connectionStatus === 'failed' && (
                  <Badge className="bg-red-500 text-white">
                    <AlertCircle className="w-3 h-3 mr-2" />
                    FAILED
                  </Badge>
                )}
                <span className="text-white font-medium">{streamTitle}</span>
                <span className="text-gray-400">#{streamId}</span>
              </div>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={handleModalClose}
                className="text-white hover:bg-white/20 pointer-events-auto focus-visible:ring-4 focus-visible:ring-primary"
                data-testid="button-close-modal"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Bottom Controls */}
          {(isConnected || connectionError) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 pointer-events-auto">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-primary"
                    data-testid="button-toggle-mute"
                    disabled={!isConnected}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  
                  <span className="text-sm text-gray-300">
                    {!isConnected ? 'No Audio' : isMuted ? 'Muted' : 'Audio On'}
                  </span>
                </div>

                <div className="flex items-center gap-4 pointer-events-auto">
                  {connectionError ? (
                    <span className="text-sm text-gray-300">Press R to retry, ESC to close</span>
                  ) : (
                    <span className="text-sm text-gray-300">Press ESC to close, F for fullscreen, M to mute</span>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-primary"
                    data-testid="button-toggle-fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}