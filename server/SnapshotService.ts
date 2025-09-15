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
  private srsHttpFlvBase: string;
  private readonly MAX_RESTART_COUNT = 5;
  private readonly WORKER_TTL = 120000; // 2 minutes
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.snapshotDir = join(process.cwd(), 'server', 'public', 'snapshots');
    // SRS HTTP-FLV is typically served on plain HTTP, not HTTPS
    this.srsHttpFlvBase = process.env.SRS_HTTP_FLV_BASE || 'http://cdn2.obedtv.live:8080';
    
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
   * Start ffmpeg worker for a stream
   */
  private startWorker(worker: StreamWorker, streamUrl?: string): void {
    if (worker.process || worker.restartCount >= this.MAX_RESTART_COUNT) {
      return;
    }

    // Derive HTTP-FLV URL from stream URL or use default pattern
    let inputUrl: string;
    if (streamUrl && streamUrl.includes('whep')) {
      // Convert WHEP URL to HTTP-FLV URL
      // Example: https://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=Socal1
      // Becomes: https://cdn2.obedtv.live:8080/live/Socal1.flv
      const urlMatch = streamUrl.match(/[?&]stream=([^&]+)/);
      const streamName = urlMatch ? urlMatch[1] : worker.streamId;
      inputUrl = `${this.srsHttpFlvBase}/live/${streamName}.flv`;
    } else {
      inputUrl = `${this.srsHttpFlvBase}/live/${worker.streamId}.flv`;
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