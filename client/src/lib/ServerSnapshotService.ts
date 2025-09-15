/**
 * Client-side service for server-side snapshot generation
 * This replaces the browser WebRTC preview system to prevent TV device crashes
 */

export class ServerSnapshotService {
  private static instance: ServerSnapshotService;
  private registeredStreams: Set<string> = new Set();
  private registrationTimer?: NodeJS.Timeout;
  
  private constructor() {
    // Start periodic stream registration to maintain server-side workers
    this.startPeriodicRegistration();
  }

  static getInstance(): ServerSnapshotService {
    if (!ServerSnapshotService.instance) {
      ServerSnapshotService.instance = new ServerSnapshotService();
    }
    return ServerSnapshotService.instance;
  }

  /**
   * Register a stream for server-side snapshot generation
   * This will start an ffmpeg worker on the server
   */
  registerStream(streamId: string): void {
    console.log(`ServerSnapshotService: Registering ${streamId} for server-side snapshots`);
    this.registeredStreams.add(streamId);
    
    // Immediately register with server to start worker quickly
    this.sendRegistrationToServer();
  }

  /**
   * Unregister a stream from server-side snapshot generation
   */
  unregisterStream(streamId: string): void {
    console.log(`ServerSnapshotService: Unregistering ${streamId} from server-side snapshots`);
    this.registeredStreams.delete(streamId);
  }

  /**
   * Get the snapshot URL for a stream with cache busting
   */
  getSnapshotUrl(streamId: string, fallbackThumbnail?: string): string {
    // Cache bust every 30 seconds to get fresh snapshots
    const timestamp = Math.floor(Date.now() / 30000);
    const sanitizedStreamId = streamId.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Return server-side snapshot URL with fallback to thumbnail
    const snapshotUrl = `/snapshots/${sanitizedStreamId}.jpg?t=${timestamp}`;
    
    return snapshotUrl;
  }

  /**
   * Check if a stream is registered for snapshots
   */
  isStreamRegistered(streamId: string): boolean {
    return this.registeredStreams.has(streamId);
  }

  /**
   * Get count of registered streams
   */
  getRegisteredStreamCount(): number {
    return this.registeredStreams.size;
  }

  /**
   * Send stream registration to server API
   */
  private async sendRegistrationToServer(): Promise<void> {
    if (this.registeredStreams.size === 0) {
      return;
    }

    try {
      const response = await fetch('/api/snapshots/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamIds: Array.from(this.registeredStreams),
        }),
      });

      if (!response.ok) {
        console.warn('ServerSnapshotService: Failed to register streams with server:', response.status);
        return;
      }

      const result = await response.json();
      console.log(
        `ServerSnapshotService: Registered ${result.registered} streams, active workers: ${result.activeWorkers}`
      );
    } catch (error) {
      console.error('ServerSnapshotService: Error registering streams:', error);
    }
  }

  /**
   * Start periodic registration to maintain server workers
   */
  private startPeriodicRegistration(): void {
    // Register every 25 seconds to maintain 2-minute TTL on server workers
    this.registrationTimer = setInterval(() => {
      this.sendRegistrationToServer();
    }, 25000); // 25 seconds
  }

  /**
   * Stop periodic registration
   */
  stopPeriodicRegistration(): void {
    if (this.registrationTimer) {
      clearInterval(this.registrationTimer);
      this.registrationTimer = undefined;
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    console.log('ServerSnapshotService: Shutting down...');
    this.stopPeriodicRegistration();
    this.registeredStreams.clear();
  }
}

// Singleton instance
const serverSnapshotService = ServerSnapshotService.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    serverSnapshotService.shutdown();
  });
}

export default serverSnapshotService;