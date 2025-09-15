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
  getStatus() {
    return {
      active: this.activeSlots.size,
      maxConcurrent: this.maxConcurrent,
      isTV: this.isTV,
      hasCapacity: this.activeSlots.size < this.maxConcurrent
    };
  }
}

export default PreviewManager;