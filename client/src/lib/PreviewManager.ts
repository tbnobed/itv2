/**
 * PreviewManager - Singleton to manage WebRTC preview connections
 * Limits concurrent connections to prevent resource exhaustion on TV devices
 */

type PreviewSlot = {
  id: string;
  streamUrl: string;
  releaseCallback: () => void;
};

interface SnapshotRegistry {
  streamUrl: string;
  callbacks: Set<(dataUrl: string) => void>;
}

class PreviewManager {
  private static instance: PreviewManager;
  private activeSlots: Map<string, PreviewSlot> = new Map();
  private maxConcurrent: number = 2; // Default for desktop
  private isTV: boolean = false;
  private snapshotTimer: number | null = null;
  private snapshotRegistry: Map<string, SnapshotRegistry> = new Map();

  private constructor() {
    // Detect TV device and set limits
    this.detectTVDevice();
  }

  static getInstance(): PreviewManager {
    if (!PreviewManager.instance) {
      PreviewManager.instance = new PreviewManager();
    }
    return PreviewManager.instance;
  }

  private detectTVDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    this.isTV = /silk|webos|tizen|roku|chromecast|firestick|androidtv|smarttv/.test(userAgent);
    
    // Strict limits for TV devices
    this.maxConcurrent = this.isTV ? 1 : 2;
    
    console.log(`PreviewManager: TV device detected: ${this.isTV}, Max concurrent: ${this.maxConcurrent}`);
  }

  /**
   * Canonicalize stream ID for consistent storage/lookup
   */
  private canonicalStreamId(streamId?: string, streamUrl?: string): string {
    // If streamUrl is provided, try to extract stream ID from it
    if (streamUrl) {
      try {
        const url = new URL(streamUrl);
        const streamParam = url.searchParams.get('stream');
        if (streamParam) {
          return streamParam.trim();
        }
      } catch (e) {
        // Fallback to streamId if URL parsing fails
      }
    }
    
    // Use provided streamId, trimmed and normalized
    return (streamId || '').trim();
  }

  /**
   * Request a preview slot for a stream
   * Returns true if granted, false if at capacity
   */
  requestSlot(streamId: string, streamUrl: string, releaseCallback: () => void): boolean {
    // If already active, allow it
    if (this.activeSlots.has(streamId)) {
      return true;
    }

    // Check if we're at capacity
    if (this.activeSlots.size >= this.maxConcurrent) {
      console.log(`PreviewManager: At capacity (${this.activeSlots.size}/${this.maxConcurrent}), denying slot for ${streamId}`);
      return false;
    }

    // Grant slot
    this.activeSlots.set(streamId, {
      id: streamId,
      streamUrl,
      releaseCallback
    });

    console.log(`PreviewManager: Granted slot ${streamId} (${this.activeSlots.size}/${this.maxConcurrent})`);
    return true;
  }

  /**
   * Release a preview slot
   */
  releaseSlot(streamId: string) {
    const slot = this.activeSlots.get(streamId);
    if (slot) {
      this.activeSlots.delete(streamId);
      console.log(`PreviewManager: Released slot ${streamId} (${this.activeSlots.size}/${this.maxConcurrent})`);
    }
  }

  /**
   * Force release the oldest slot to make room for a new one
   * Used when user focuses a new tile and we're at capacity
   */
  forceReleaseOldest(): boolean {
    if (this.activeSlots.size === 0) return false;

    // Get the first (oldest) slot
    const firstEntry = this.activeSlots.entries().next().value;
    if (firstEntry) {
      const [streamId, slot] = firstEntry;
      
      // Call the release callback to clean up the connection
      slot.releaseCallback();
      
      // Remove from active slots
      this.activeSlots.delete(streamId);
      
      console.log(`PreviewManager: Force released oldest slot ${streamId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get current capacity info
   */
  /**
   * Register a stream for snapshot updates
   */
  registerStreamForSnapshot(streamId: string, streamUrl: string, callback: (dataUrl: string) => void) {
    const canonicalId = this.canonicalStreamId(streamId, streamUrl);
    
    // Get or create registry entry
    let registry = this.snapshotRegistry.get(canonicalId);
    if (!registry) {
      registry = {
        streamUrl,
        callbacks: new Set<(dataUrl: string) => void>()
      };
      this.snapshotRegistry.set(canonicalId, registry);
    }
    
    // Ensure callbacks Set exists
    if (!registry.callbacks) {
      registry.callbacks = new Set<(dataUrl: string) => void>();
    }
    
    // Add callback to the set
    registry.callbacks.add(callback);
    
    // Start snapshot timer if this is the first stream
    if (this.snapshotRegistry.size === 1 && !this.snapshotTimer) {
      this.startSnapshotTimer();
    }
    
    console.log(`PreviewManager: Registered ${streamId} (canonical: ${canonicalId}) for snapshots (${this.snapshotRegistry.size} streams, ${registry.callbacks.size} callbacks for this stream)`);
  }

  /**
   * Unregister a stream from snapshot updates
   */
  unregisterStreamFromSnapshot(streamId: string) {
    const canonicalId = this.canonicalStreamId(streamId);
    
    const registry = this.snapshotRegistry.get(canonicalId);
    if (registry) {
      // Find and remove the callback (we can't identify which specific callback, so remove all for this streamId)
      // In practice this is fine since each StreamTile component calls this on unmount
      this.snapshotRegistry.delete(canonicalId);
      
      console.log(`PreviewManager: Unregistered ${streamId} (canonical: ${canonicalId}) from snapshots (${this.snapshotRegistry.size} streams)`);
    }
    
    // Stop snapshot timer if no streams left
    if (this.snapshotRegistry.size === 0 && this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
      console.log('PreviewManager: Stopped snapshot timer');
    }
  }

  /**
   * Start the snapshot refresh timer
   */
  private startSnapshotTimer() {
    if (this.snapshotTimer) return;
    
    console.log('PreviewManager: Starting snapshot timer (30 second intervals)');
    
    // Capture initial snapshots immediately
    setTimeout(() => this.captureAllSnapshots(), 1000);
    
    // Then refresh every 30 seconds
    this.snapshotTimer = window.setInterval(() => {
      this.captureAllSnapshots();
    }, 30000);
  }

  /**
   * Capture snapshots for all visible streams sequentially
   */
  private async captureAllSnapshots() {
    if (this.snapshotRegistry.size === 0) return;
    
    console.log(`PreviewManager: Capturing snapshots for ${this.snapshotRegistry.size} streams`);
    
    for (const [canonicalId, registry] of Array.from(this.snapshotRegistry.entries())) {
      try {
        await this.captureStreamSnapshot(canonicalId, registry);
        // Small delay between snapshots to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`PreviewManager: Failed to capture snapshot for ${canonicalId}:`, error);
      }
    }
    
    console.log('PreviewManager: Completed snapshot batch');
  }

  /**
   * Capture a single snapshot for a stream with black frame detection and retry logic
   */
  private async captureStreamSnapshot(canonicalId: string, registry?: SnapshotRegistry): Promise<void> {
    if (!registry) {
      registry = this.snapshotRegistry.get(canonicalId);
    }
    if (!registry || registry.callbacks.size === 0) return;

    const { streamUrl, callbacks } = registry;
    console.log(`PreviewManager: Capturing snapshot for ${canonicalId}, callbacks: ${callbacks.size}, streamUrl: ${streamUrl}`);

    return new Promise(async (resolve, reject) => {
      let sdk: any = null;
      let video: HTMLVideoElement | null = null;
      let attemptCount = 0;
      const maxAttempts = 5;
      const overallTimeoutMs = 15000; // 15 second overall timeout
      
      const timeoutId = setTimeout(() => {
        this.cleanupCapture(sdk, video);
        reject(new Error(`Snapshot timeout after ${overallTimeoutMs}ms`));
      }, overallTimeoutMs);

      const cleanupAndResolve = (success: boolean) => {
        clearTimeout(timeoutId);
        this.cleanupCapture(sdk, video);
        if (success) {
          resolve();
        } else {
          reject(new Error('Failed all capture attempts'));
        }
      };

      try {
        if (typeof SrsRtcWhipWhepAsync === 'undefined') {
          throw new Error('SRS SDK not loaded');
        }

        sdk = SrsRtcWhipWhepAsync();
        
        // Set up video element for capture - positioned offscreen instead of display:none
        // Browsers don't decode frames for display:none videos
        video = document.createElement('video');
        video.style.position = 'fixed';
        video.style.top = '-10000px';
        video.style.left = '-10000px';
        video.style.width = '2px';
        video.style.height = '2px';
        video.style.opacity = '0';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        
        video.srcObject = sdk.stream;
        
        // Retry capture with black frame detection
        const attemptCapture = async (): Promise<void> => {
          attemptCount++;
          console.log(`PreviewManager: Capture attempt ${attemptCount}/${maxAttempts} for ${canonicalId}`);
          
          return new Promise((attemptResolve, attemptReject) => {
            // Wait for video to be playing and have frame data
            const checkVideoReady = () => {
              if (!video) {
                attemptReject(new Error('Video element destroyed'));
                return;
              }

              // Check if video is playing and has actual dimensions
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                // Wait longer for GOP/keyframe interval (2-5 seconds typical for broadcast streams)
                const gopDelayMs = 2000 + Math.random() * 3000; // 2-5 second delay for GOP
                console.log(`PreviewManager: Video ready for ${canonicalId}, waiting ${gopDelayMs.toFixed(0)}ms for GOP/keyframe`);
                
                setTimeout(() => {
                  if (!video) {
                    attemptReject(new Error('Video element destroyed during capture'));
                    return;
                  }
                  this.captureAndValidateFrame(video, canonicalId, callbacks)
                    .then(result => {
                      if (result.success) {
                        console.log(`PreviewManager: ✓ Valid frame captured for ${canonicalId} (attempt ${attemptCount}, brightness: ${result.brightness?.toFixed(2)}, variance: ${result.variance?.toFixed(2)})`);
                        attemptResolve();
                      } else {
                        console.warn(`PreviewManager: ✗ Black/invalid frame detected for ${canonicalId} (attempt ${attemptCount}, brightness: ${result.brightness?.toFixed(2)}, variance: ${result.variance?.toFixed(2)})`);
                        attemptReject(new Error('Black frame detected'));
                      }
                    })
                    .catch(attemptReject);
                }, gopDelayMs);
              } else {
                // Not ready yet, check again
                setTimeout(checkVideoReady, 200);
              }
            };

            checkVideoReady();
          });
        };

        // Set up video event handlers
        video.onplaying = () => {
          console.log(`PreviewManager: Video playing for ${canonicalId}, starting capture attempts`);
        };

        video.onerror = () => {
          cleanupAndResolve(false);
        };

        // Retry logic
        const executeWithRetry = async () => {
          while (attemptCount < maxAttempts) {
            try {
              await attemptCapture();
              cleanupAndResolve(true);
              return;
            } catch (error) {
              console.warn(`PreviewManager: Attempt ${attemptCount} failed for ${canonicalId}:`, error);
              
              if (attemptCount >= maxAttempts) {
                console.error(`PreviewManager: All ${maxAttempts} attempts failed for ${canonicalId}`);
                cleanupAndResolve(false);
                return;
              }
              
              // Wait before retry (300-500ms)
              const retryDelay = 300 + Math.random() * 200;
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        };

        await sdk.play(streamUrl, { videoOnly: true, audioOnly: false });
        
        // Explicitly call video.play() after SDK play to ensure frame decoding
        try {
          await video.play();
          console.log(`PreviewManager: Video.play() completed for ${canonicalId}`);
        } catch (error) {
          console.error(`PreviewManager: Video.play() failed for ${canonicalId}:`, error);
        }
        
        executeWithRetry();
        
      } catch (error) {
        console.error(`PreviewManager: SDK error for ${canonicalId}:`, error);
        cleanupAndResolve(false);
      }
    });
  }

  /**
   * Capture frame and validate it's not black/empty
   */
  private async captureAndValidateFrame(
    video: HTMLVideoElement, 
    canonicalId: string, 
    callbacks: Set<(dataUrl: string) => void>
  ): Promise<{success: boolean, brightness?: number, variance?: number}> {
    
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return { success: false };
    }

    // Create canvas for capture - downscaled for performance
    const targetWidth = 320;
    const targetHeight = 180;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false };
    }

    // Draw video frame to canvas (downscaled)
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    
    // Get image data for validation
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const validation = this.validateFrameContent(imageData);
    
    if (!validation.isValid) {
      return { 
        success: false, 
        brightness: validation.avgBrightness, 
        variance: validation.variance 
      };
    }

    // Frame is valid, create final image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    
    if (dataUrl && dataUrl.length > 1000) { // Ensure reasonable image size
      // Call all registered callbacks for this stream
      for (const callback of Array.from(callbacks)) {
        callback(dataUrl);
      }
      
      return { 
        success: true, 
        brightness: validation.avgBrightness, 
        variance: validation.variance 
      };
    }
    
    return { success: false };
  }

  /**
   * Validate frame content to detect black/empty frames
   */
  private validateFrameContent(imageData: ImageData): {
    isValid: boolean;
    avgBrightness: number;
    variance: number;
  } {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    
    // Sample every 8th pixel for performance - reduces sample size but still gives good accuracy
    const sampleStep = 8;
    const sampleSize = Math.floor(pixelCount / sampleStep);
    let totalBrightness = 0;
    const brightnessValues: number[] = [];
    let validSamples = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const pixelIndex = (i * sampleStep) * 4; // Convert pixel index to byte index
      if (pixelIndex + 3 >= data.length) break;
      
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Calculate luminance (perceived brightness)
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
      brightnessValues.push(brightness);
      totalBrightness += brightness;
      validSamples++;
    }
    
    if (validSamples === 0) {
      return { isValid: false, avgBrightness: 0, variance: 0 };
    }
    
    const avgBrightness = totalBrightness / validSamples;
    
    // Calculate variance
    const variance = brightnessValues.reduce((acc, val) => {
      return acc + Math.pow(val - avgBrightness, 2);
    }, 0) / validSamples;
    
    // Normal validation thresholds  
    const minBrightness = 5; // Minimum brightness for valid content
    const minVariance = 20;   // Minimum variance for valid content
    
    const isValid = avgBrightness > minBrightness || variance > minVariance;
    
    return {
      isValid,
      avgBrightness,
      variance
    };
  }

  /**
   * Clean up SDK and video resources
   */
  private cleanupCapture(sdk: any, video: HTMLVideoElement | null) {
    if (video && video.parentNode) {
      video.parentNode.removeChild(video);
    }
    if (sdk) {
      try { 
        sdk.close(); 
      } catch (e) {
        console.warn('PreviewManager: Error closing SDK:', e);
      }
    }
  }

  getStatus() {
    return {
      active: this.activeSlots.size,
      maxConcurrent: this.maxConcurrent,
      isTV: this.isTV,
      hasCapacity: this.activeSlots.size < this.maxConcurrent,
      snapshotStreams: this.snapshotRegistry.size,
      snapshotActive: !!this.snapshotTimer
    };
  }
}

export default PreviewManager;