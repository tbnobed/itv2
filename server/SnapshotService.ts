import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

interface StreamWorker {
  streamId: string;
  process: ChildProcess | null;
  lastActivity: number;
  restartCount: number;
  isActive: boolean;
}

export class SnapshotService {
  private static instance: SnapshotService;
  private workers: Map<string, StreamWorker> = new Map();
  private snapshotDir: string;
  private srsHttpHlsBase: string;
  private readonly MAX_RESTART_COUNT = 5;
  private readonly WORKER_TTL = 120000; // 2 minutes
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.snapshotDir = join(process.cwd(), 'server', 'public', 'snapshots');
    
    // Default SRS server for fallback (optional)
    this.srsHttpHlsBase = process.env.SRS_HTTP_HLS_BASE || '';
    
    // Ensure snapshot directory exists
    if (!existsSync(this.snapshotDir)) {
      mkdirSync(this.snapshotDir, { recursive: true });
    }

    // Start health check timer
    this.startHealthCheck();
    
    console.log(`SnapshotService initialized: ${this.snapshotDir}`);
  }

  static getInstance(): SnapshotService {
    if (!SnapshotService.instance) {
      SnapshotService.instance = new SnapshotService();
    }
    return SnapshotService.instance;
  }

  /**
   * Register a stream for snapshot generation (extends TTL)
   */
  registerStream(streamId: string, streamUrl?: string): void {
    // Sanitize streamId for file paths
    const sanitizedStreamId = streamId.replace(/[^a-zA-Z0-9-_]/g, '');
    
    
    const existing = this.workers.get(sanitizedStreamId);
    if (existing) {
      // Extend TTL
      existing.lastActivity = Date.now();
      console.log(`SnapshotService: Extended TTL for ${sanitizedStreamId}`);
      return;
    }

    // Create new worker
    const worker: StreamWorker = {
      streamId: sanitizedStreamId,
      process: null,
      lastActivity: Date.now(),
      restartCount: 0,
      isActive: false
    };

    this.workers.set(sanitizedStreamId, worker);
    this.startWorker(worker, streamUrl);
    console.log(`SnapshotService: Registered new stream ${sanitizedStreamId}`);
  }

  /**
   * Unregister a stream (stops worker immediately)
   */
  unregisterStream(streamId: string): void {
    const sanitizedStreamId = streamId.replace(/[^a-zA-Z0-9-_]/g, '');
    const worker = this.workers.get(sanitizedStreamId);
    
    if (worker) {
      this.stopWorker(worker);
      this.workers.delete(sanitizedStreamId);
      console.log(`SnapshotService: Unregistered stream ${sanitizedStreamId}`);
    }
  }

  /**
   * Get snapshot file path for a stream
   */
  getSnapshotPath(streamId: string): string {
    const sanitizedStreamId = streamId.replace(/[^a-zA-Z0-9-_]/g, '');
    return join(this.snapshotDir, `${sanitizedStreamId}.jpg`);
  }

  /**
   * Check if snapshot exists and is recent
   */
  hasRecentSnapshot(streamId: string, maxAgeMs: number = 60000): boolean {
    const snapshotPath = this.getSnapshotPath(streamId);
    
    if (!existsSync(snapshotPath)) {
      return false;
    }

    try {
      const stats = statSync(snapshotPath);
      const age = Date.now() - stats.mtime.getTime();
      return age < maxAgeMs;
    } catch (error) {
      console.error(`SnapshotService: Error checking snapshot ${streamId}:`, error);
      return false;
    }
  }

  /**
   * Convert WHEP URL to HTTP-HLS URL by parsing server info dynamically
   */
  private convertWhepToHttpHls(whepUrl: string, streamId: string): string | null {
    try {
      const url = new URL(whepUrl);
      const streamMatch = whepUrl.match(/[?&]stream=([^&]+)/);
      const streamName = streamMatch ? streamMatch[1] : streamId;
      
      // Use the same port as the WHEP URL for HTTP-HLS
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      
      // Use HTTP for HTTP-HLS streams (SRS typically serves HTTP-HLS on HTTP even if WHEP is HTTPS)
      const protocol = process.env.SRS_FORCE_HTTPS === 'true' ? 'https' : 'http';
      
      return `${protocol}://${url.hostname}:${port}/live/${streamName}.m3u8`;
    } catch (error) {
      console.error(`SnapshotService: Error parsing WHEP URL ${whepUrl}:`, error);
      // No fallback - return null if parsing fails
      return null;
    }
  }
  
  /**
   * Get fallback URL when WHEP parsing fails
   */
  private getFallbackUrl(streamId: string): string {
    if (this.srsHttpHlsBase) {
      return `${this.srsHttpHlsBase}/live/${streamId}.m3u8`;
    }
    
    // No fallback - return null if no valid server configuration
    console.warn(`SnapshotService: No server configuration available for ${streamId}, skipping snapshot generation`);
    return null;
  }

  /**
   * Start ffmpeg worker for a stream
   */
  private startWorker(worker: StreamWorker, streamUrl?: string): void {
    if (worker.process || worker.restartCount >= this.MAX_RESTART_COUNT) {
      return;
    }

    // Derive HTTP-HLS URL from stream URL or use fallback
    let inputUrl: string | null;
    if (streamUrl && (streamUrl.includes('whep') || streamUrl.includes('rtc/v1'))) {
      // Convert WHEP/WebRTC URL to HTTP-HLS URL dynamically
      inputUrl = this.convertWhepToHttpHls(streamUrl, worker.streamId);
    } else {
      // Use fallback for non-WHEP URLs
      inputUrl = this.getFallbackUrl(worker.streamId);
    }

    // Skip worker creation if no valid URL available
    if (!inputUrl) {
      console.log(`SnapshotService: Skipping worker for ${worker.streamId} - no valid stream URL`);
      return;
    }

    const outputPath = this.getSnapshotPath(worker.streamId);
    
    console.log(`SnapshotService: Starting worker for ${worker.streamId}`);
    console.log(`  Input: ${inputUrl}`);
    console.log(`  Output: ${outputPath}`);

    // ffmpeg command to capture snapshots every 30 seconds
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-reconnect', '1',
      '-reconnect_streamed', '1', 
      '-reconnect_on_network_error', '1',
      '-i', inputUrl,
      '-vf', 'fps=1/30,scale=320:-1',  // 1 frame every 30 seconds, scale to 320px width
      '-q:v', '5',  // JPEG quality
      '-f', 'image2',
      '-update', '1',  // Continuously overwrite the same file
      '-y',  // Overwrite output file
      outputPath
    ];

    const ffmpegProcess = spawn('ffmpeg', args);
    
    worker.process = ffmpegProcess;
    worker.isActive = true;
    worker.restartCount++;

    ffmpegProcess.stdout?.on('data', (data) => {
      // ffmpeg outputs to stderr, stdout should be minimal
    });

    ffmpegProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      // Log only important messages, filter out routine reconnects
      if (message.includes('error') || message.includes('failed')) {
        console.error(`SnapshotService[${worker.streamId}]: ${message.trim()}`);
      }
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`SnapshotService[${worker.streamId}]: Process exited with code ${code}`);
      worker.process = null;
      worker.isActive = false;
      
      // Restart with backoff if within restart limit
      if (worker.restartCount < this.MAX_RESTART_COUNT) {
        const backoffMs = Math.min(1000 * Math.pow(2, worker.restartCount - 1), 30000);
        console.log(`SnapshotService[${worker.streamId}]: Restarting in ${backoffMs}ms (attempt ${worker.restartCount + 1})`);
        
        setTimeout(() => {
          if (this.workers.has(worker.streamId)) {
            this.startWorker(worker, streamUrl);
          }
        }, backoffMs);
      } else {
        console.error(`SnapshotService[${worker.streamId}]: Max restart attempts exceeded`);
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`SnapshotService[${worker.streamId}]: Process error:`, error);
      worker.process = null;
      worker.isActive = false;
    });
  }

  /**
   * Stop a worker process
   */
  private stopWorker(worker: StreamWorker): void {
    if (worker.process) {
      console.log(`SnapshotService: Stopping worker for ${worker.streamId}`);
      worker.process.kill('SIGTERM');
      
      // Force kill if it doesn't stop gracefully
      setTimeout(() => {
        if (worker.process && !worker.process.killed) {
          worker.process.kill('SIGKILL');
        }
      }, 5000);
      
      worker.process = null;
      worker.isActive = false;
    }
  }

  /**
   * Health check to remove expired workers and validate snapshots
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      const expiredWorkers: string[] = [];
      
      for (const [streamId, worker] of Array.from(this.workers.entries())) {
        // Check TTL expiry
        if (now - worker.lastActivity > this.WORKER_TTL) {
          expiredWorkers.push(streamId);
          continue;
        }
        
        // Check if snapshot file is being updated
        if (worker.isActive && !this.hasRecentSnapshot(streamId, 90000)) { // 1.5 minutes
          console.warn(`SnapshotService[${streamId}]: No recent snapshot, restarting worker`);
          this.stopWorker(worker);
          worker.restartCount = 0; // Reset restart count for health issue
          this.startWorker(worker);
        }
      }
      
      // Remove expired workers
      for (const streamId of expiredWorkers) {
        console.log(`SnapshotService: TTL expired for ${streamId}`);
        const worker = this.workers.get(streamId);
        if (worker) {
          this.stopWorker(worker);
          this.workers.delete(streamId);
        }
      }
      
      if (expiredWorkers.length > 0 || this.workers.size > 0) {
        console.log(`SnapshotService: Health check complete. Active workers: ${this.workers.size}`);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Get active worker count
   */
  getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter(w => w.isActive).length;
  }

  /**
   * Cleanup all workers on shutdown
   */
  shutdown(): void {
    console.log('SnapshotService: Shutting down...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    for (const worker of Array.from(this.workers.values())) {
      this.stopWorker(worker);
    }
    
    this.workers.clear();
    console.log('SnapshotService: Shutdown complete');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  SnapshotService.getInstance().shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  SnapshotService.getInstance().shutdown();
  process.exit(0);
});