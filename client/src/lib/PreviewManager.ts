/**
 * PreviewManager - Singleton to manage WebRTC preview connections
 * Limits concurrent connections to prevent resource exhaustion on TV devices
 */

type PreviewSlot = {
  id: string;
  streamUrl: string;
  releaseCallback: () => void;
};

class PreviewManager {
  private static instance: PreviewManager;
  private activeSlots: Map<string, PreviewSlot> = new Map();
  private maxConcurrent: number = 2; // Default for desktop
  private isTV: boolean = false;
  private snapshotTimer: number | null = null;
  private visibleStreams: Set<string> = new Set();
  private snapshotCallbacks: Map<string, (dataUrl: string) => void> = new Map();

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
    this.visibleStreams.add(streamId);
    this.snapshotCallbacks.set(streamId, callback);
    
    // Start snapshot timer if this is the first stream
    if (this.visibleStreams.size === 1 && !this.snapshotTimer) {
      this.startSnapshotTimer();
    }
    
    console.log(`PreviewManager: Registered ${streamId} for snapshots (${this.visibleStreams.size} streams)`);
  }

  /**
   * Unregister a stream from snapshot updates
   */
  unregisterStreamFromSnapshot(streamId: string) {
    this.visibleStreams.delete(streamId);
    this.snapshotCallbacks.delete(streamId);
    
    // Stop snapshot timer if no streams left
    if (this.visibleStreams.size === 0 && this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
      console.log('PreviewManager: Stopped snapshot timer');
    }
    
    console.log(`PreviewManager: Unregistered ${streamId} from snapshots (${this.visibleStreams.size} streams)`);
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
    if (this.visibleStreams.size === 0) return;
    
    console.log(`PreviewManager: Capturing snapshots for ${this.visibleStreams.size} streams`);
    
    for (const streamId of Array.from(this.visibleStreams)) {
      try {
        await this.captureStreamSnapshot(streamId);
        // Small delay between snapshots to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`PreviewManager: Failed to capture snapshot for ${streamId}:`, error);
      }
    }
    
    console.log('PreviewManager: Completed snapshot batch');
  }

  /**
   * Capture a single snapshot for a stream
   */
  private async captureStreamSnapshot(streamId: string): Promise<void> {
    const callback = this.snapshotCallbacks.get(streamId);
    if (!callback) return;

    return new Promise(async (resolve, reject) => {
      let sdk: any = null;
      const timeoutId = setTimeout(() => {
        if (sdk) {
          try { sdk.close(); } catch (e) {}
        }
        reject(new Error('Snapshot timeout'));
      }, 10000); // 10 second timeout

      try {
        if (typeof SrsRtcWhipWhepAsync === 'undefined') {
          throw new Error('SRS SDK not loaded');
        }

        sdk = SrsRtcWhipWhepAsync();
        
        // Get stream URL for this streamId (assuming it follows pattern)
        const streamUrl = `https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=${streamId}`;
        
        // Set up video element for capture
        const video = document.createElement('video');
        video.style.display = 'none';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        
        video.srcObject = sdk.stream;
        
        // Wait for video to load and capture frame
        video.onloadeddata = () => {
          // Wait a moment for frame to stabilize
          setTimeout(() => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 320;
              canvas.height = video.videoHeight || 180;
              
              const ctx = canvas.getContext('2d');
              if (ctx && video.videoWidth > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                callback(dataUrl);
                console.log(`PreviewManager: Captured snapshot for ${streamId}`);
              }
              
              // Cleanup
              document.body.removeChild(video);
              if (sdk) sdk.close();
              clearTimeout(timeoutId);
              resolve();
            } catch (error) {
              document.body.removeChild(video);
              if (sdk) sdk.close();
              clearTimeout(timeoutId);
              reject(error);
            }
          }, 1000);
        };

        video.onerror = () => {
          document.body.removeChild(video);
          if (sdk) sdk.close();
          clearTimeout(timeoutId);
          reject(new Error('Video load error'));
        };

        await sdk.play(streamUrl, { videoOnly: true, audioOnly: false });
      } catch (error) {
        if (sdk) {
          try { sdk.close(); } catch (e) {}
        }
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  getStatus() {
    return {
      active: this.activeSlots.size,
      maxConcurrent: this.maxConcurrent,
      isTV: this.isTV,
      hasCapacity: this.activeSlots.size < this.maxConcurrent,
      snapshotStreams: this.visibleStreams.size,
      snapshotActive: !!this.snapshotTimer
    };
  }
}

export default PreviewManager;