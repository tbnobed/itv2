ay`);
              setIsLoading(false);
              setConnectionStatus('connected');
              setIsConnected(true);
            }}
            className={cn(
              "w-full h-full",
              isConnected ? "block" : "hidden"
            )}
          />
        ) : (
          /* WebRTC Video Element */
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
        )}

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
                  <span className="text-sm text-gray-300">
                    {connectionError ? 'Press R to retry' : 'M to mute'} | Back to close
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}