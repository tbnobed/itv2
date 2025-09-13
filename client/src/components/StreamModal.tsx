import { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreamModalProps {
  isOpen: boolean;
  streamId: string;
  streamUrl: string;
  streamTitle: string;
  onClose: () => void;
}

export default function StreamModal({ 
  isOpen, 
  streamId, 
  streamUrl, 
  streamTitle, 
  onClose 
}: StreamModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  // todo: remove mock functionality - integrate real SRS WebRTC player
  useEffect(() => {
    if (isOpen) {
      console.log(`Starting WebRTC stream: ${streamUrl}`);
      setIsLoading(true);
      
      // Simulate connection
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsConnected(true);
        console.log(`Connected to stream ${streamId}`);
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
      setIsConnected(false);
      console.log(`Disconnected from stream ${streamId}`);
    }
  }, [isOpen, streamUrl, streamId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case ' ':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(`Audio ${!isMuted ? 'muted' : 'unmuted'}`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
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
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onMouseMove={handleMouseMove}
      data-testid="stream-modal"
    >
      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Mock Video Element - todo: replace with real SRS WebRTC player */}
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-lg">Connecting to stream...</p>
              <p className="text-gray-400 text-sm">{streamUrl}</p>
            </div>
          ) : (
            <>
              {/* Simulated video content */}
              <video 
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                muted={isMuted}
                playsInline
                data-testid="video-player"
              >
                <source src="" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {/* Overlay showing it's a demo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 rounded-lg p-8 text-center">
                  <h3 className="text-white text-2xl font-bold mb-2">{streamTitle}</h3>
                  <Badge className="bg-red-500 text-white mb-4">LIVE DEMO</Badge>
                  <p className="text-gray-300">Stream ID: {streamId}</p>
                  <p className="text-gray-400 text-sm mt-2">WebRTC Player Ready</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls Overlay */}
        <div 
          className={cn(
            "absolute inset-0 transition-opacity duration-300 pointer-events-none",
            showControls || isLoading ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-red-500 text-white">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                  LIVE
                </Badge>
                <span className="text-white font-medium">{streamTitle}</span>
                <span className="text-gray-400">#{streamId}</span>
              </div>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/20 pointer-events-auto focus-visible:ring-4 focus-visible:ring-primary"
                data-testid="button-close-modal"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Bottom Controls */}
          {isConnected && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 pointer-events-auto">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-primary"
                    data-testid="button-toggle-mute"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  
                  <span className="text-sm text-gray-300">
                    {isMuted ? 'Muted' : 'Audio On'}
                  </span>
                </div>

                <div className="flex items-center gap-4 pointer-events-auto">
                  <span className="text-sm text-gray-300">Press ESC to close, F for fullscreen, M to mute</span>
                  
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