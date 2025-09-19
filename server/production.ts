import express, { type Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { insertStreamSchema, updateStreamSchema, insertStudioSchema, updateStudioSchema, insertUserSchema } from "../shared/schema";
import { z } from "zod";
import { setupAuth, requireAuth, requireAdmin, csrfProtection } from "./auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { studios } from "../shared/schema";
import path from "path";
import fs from "fs";

// Simple logger function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Automatic database initialization - idempotent
async function initializeDatabase() {
  try {
    // Check if tables exist by trying to query studios table
    await db.select().from(studios).limit(1);
    log("Database tables already exist, skipping schema setup", "db");
  } catch (error) {
    // Tables don't exist, run schema push
    log("Database tables not found, initializing schema...", "db");
    
    try {
      // Import dynamically to avoid issues
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      
      const execCommand = promisify(spawn);
      
      // Run npm run db:push to create tables
      const dbPush = spawn('npm', ['run', 'db:push'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      let errorOutput = '';
      
      dbPush.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      dbPush.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        dbPush.on('close', (code) => {
          if (code === 0) {
            log("Database schema initialized successfully", "db");
            resolve(code);
          } else {
            log(`Database schema initialization failed with code ${code}: ${errorOutput}`, "db");
            reject(new Error(`DB push failed: ${errorOutput}`));
          }
        });
      });
      
    } catch (pushError) {
      log(`Failed to initialize database schema: ${pushError}`, "db");
      throw pushError;
    }
  }
}

// Production static file serving
function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

const app = express();
// Increase body parser limits to handle large file uploads (150MB to be safe)
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: false, limit: '150mb' }));
app.use(express.raw({ limit: '150mb', type: 'application/*' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// registerRoutes function inlined to avoid import issues
async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes first
  setupAuth(app);
  
  // Initialize SnapshotService for server-side video preview generation
  let snapshotService: any;
  try {
    const { SnapshotService } = await import("./SnapshotService.js");
    snapshotService = SnapshotService.getInstance();
    
    // Serve static snapshot files
    const { join } = await import("path");
    const snapshotsPath = join(process.cwd(), 'server', 'public', 'snapshots');
    app.use('/snapshots', express.static(snapshotsPath, {
      maxAge: 0, // No caching
      etag: true,
      lastModified: true,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store');
      }
    }));
    
    console.log(`✅ SnapshotService initialized in production mode`);
  } catch (error) {
    console.error("❌ SnapshotService initialization failed:", error);
    // Continue startup - frontend will fallback to thumbnails
  }
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const activeWorkers = snapshotService ? snapshotService.getActiveWorkerCount() : 0;
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      snapshotWorkers: activeWorkers
    });
  });
  
  // Initialize database schema automatically (idempotent)
  await initializeDatabase();
  
  // Seed database on startup
  seedDatabase();
  // Stream endpoints
  app.get('/api/streams', async (req, res) => {
    try {
      const allStreams = await storage.getAllStreams();
      
      // Group streams by category for easier frontend consumption
      const groupedStreams = {
        featured: allStreams.filter(s => s.category === 'featured'),
        overTheAir: allStreams.filter(s => s.category === 'overTheAir'),
        liveFeeds: allStreams.filter(s => s.category === 'liveFeeds'),
        studios: allStreams.filter(s => s.category === 'studios'),
        uhd: allStreams.filter(s => s.category === 'uhd')
      };
      
      res.json(groupedStreams);
    } catch (error) {
      console.error('Error fetching streams:', error);
      res.status(500).json({ error: 'Failed to fetch streams' });
    }
  });

  // More specific routes first to avoid conflicts
  app.get('/api/streams/studio/:studioId', async (req, res) => {
    try {
      const { studioId } = req.params;
      const streams = await storage.getStreamsByStudio(studioId);
      res.json(streams);
    } catch (error) {
      console.error(`Error fetching streams for studio ${req.params.studioId}:`, error);
      res.status(500).json({ error: 'Failed to fetch studio streams' });
    }
  });

  app.get('/api/streams/category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const streams = await storage.getStreamsByCategory(category);
      res.json(streams);
    } catch (error) {
      console.error(`Error fetching streams for category ${req.params.category}:`, error);
      res.status(500).json({ error: 'Failed to fetch streams for category' });
    }
  });

  app.get('/api/streams/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const stream = await storage.getStream(id);
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }
      
      res.json(stream);
    } catch (error) {
      console.error(`Error fetching stream ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to fetch stream' });
    }
  });

  app.post('/api/streams', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertStreamSchema.parse(req.body);
      const stream = await storage.createStream(validatedData);
      res.status(201).json(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid stream data', details: error.errors });
      } else {
        console.error('Error creating stream:', error);
        res.status(500).json({ error: 'Failed to create stream' });
      }
    }
  });

  app.put('/api/streams/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStreamSchema.parse(req.body);
      const stream = await storage.updateStream(id, validatedData);
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }
      
      res.json(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid stream data', details: error.errors });
      } else {
        console.error('Error updating stream:', error);
        res.status(500).json({ error: 'Failed to update stream' });
      }
    }
  });

  app.delete('/api/streams/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStream(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Stream not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting stream:', error);
      res.status(500).json({ error: 'Failed to delete stream' });
    }
  });

  // Studio endpoints
  app.get('/api/studios', async (req, res) => {
    try {
      const studios = await storage.getAllStudios();
      res.json(studios);
    } catch (error) {
      console.error('Error fetching studios:', error);
      res.status(500).json({ error: 'Failed to fetch studios' });
    }
  });

  app.get('/api/studios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const studio = await storage.getStudio(id);
      
      if (!studio) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.json(studio);
    } catch (error) {
      console.error('Error fetching studio:', error);
      res.status(500).json({ error: 'Failed to fetch studio' });
    }
  });

  app.post('/api/studios', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertStudioSchema.parse(req.body);
      const studio = await storage.createStudio(validatedData);
      res.status(201).json(studio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid studio data', details: error.errors });
      } else {
        console.error('Error creating studio:', error);
        res.status(500).json({ error: 'Failed to create studio' });
      }
    }
  });

  app.put('/api/studios/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStudioSchema.parse(req.body);
      const studio = await storage.updateStudio(id, validatedData);
      
      if (!studio) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.json(studio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid studio data', details: error.errors });
      } else {
        console.error('Error updating studio:', error);
        res.status(500).json({ error: 'Failed to update studio' });
      }
    }
  });

  app.delete('/api/studios/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStudio(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Studio not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting studio:', error);
      res.status(500).json({ error: 'Failed to delete studio' });
    }
  });

  // Admin-only user management endpoints
  app.post('/api/admin/users', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Hash the password before storing
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      const userData = {
        ...validatedData,
        password: hashedPassword
      };
      
      const user = await storage.createUser(userData);
      
      // Remove password field for security
      const safeUser = {
        ...user,
        password: undefined,
        createdAt: user.createdAt || new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid user data', details: error.errors });
      } else {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password field for security
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined,
        createdAt: user.createdAt || new Date().toISOString(),
        lastActive: new Date().toISOString()
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:id/role', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      const updated = await storage.updateUserRole(id, role);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  app.put('/api/admin/users/:id/status', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      const updated = await storage.updateUserStatus(id, isActive);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  // Snapshot endpoints for server-side video preview generation
  if (snapshotService) {
    // Direct snapshot access with cache busting
    app.get('/api/streams/:id/snapshot', (req, res) => {
      try {
        const { id } = req.params;
        const snapshotPath = snapshotService.getSnapshotPath(id);
        
        const { existsSync } = require('fs');
        if (existsSync(snapshotPath)) {
          // Redirect to static file with cache busting
          const timestamp = Math.floor(Date.now() / 30000); // 30 second cache intervals
          res.redirect(302, `/snapshots/${id.replace(/[^a-zA-Z0-9-_]/g, '')}.jpg?t=${timestamp}`);
        } else {
          res.status(404).json({ error: 'Snapshot not available' });
        }
      } catch (error) {
        console.error(`Error serving snapshot for ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to serve snapshot' });
      }
    });

    // Register streams for snapshot generation (extends TTL)
    app.post('/api/snapshots/register', async (req, res) => {
      try {
        const { streamIds } = req.body;
        
        if (!Array.isArray(streamIds)) {
          return res.status(400).json({ error: 'streamIds must be an array' });
        }

        // Get stream details and register with snapshot service
        const registeredStreams: string[] = [];
        
        for (const streamId of streamIds) {
          try {
            // Find the stream to get its URL
            const allStreams = await storage.getAllStreams();
            const stream = allStreams.find(s => s.streamId === streamId);
            
            if (stream) {
              snapshotService.registerStream(streamId, stream.url);
              registeredStreams.push(streamId);
            }
          } catch (error) {
            console.warn(`Failed to register stream ${streamId}:`, error);
          }
        }
        
        res.json({ 
          registered: registeredStreams.length,
          streamIds: registeredStreams,
          activeWorkers: snapshotService.getActiveWorkerCount()
        });
      } catch (error) {
        console.error('Error registering streams for snapshots:', error);
        res.status(500).json({ error: 'Failed to register streams' });
      }
    });
  } else {
    // Fallback endpoints when SnapshotService is not available
    app.get('/api/streams/:id/snapshot', (req, res) => {
      res.status(503).json({ error: 'Snapshot service not available' });
    });
    
    app.post('/api/snapshots/register', (req, res) => {
      res.status(503).json({ error: 'Snapshot service not available' });
    });
  }

  // APK management endpoints (admin only)
  app.get('/api/admin/apk/info', requireAdmin, async (req, res) => {
    try {
      const { join } = await import("path");
      const { existsSync, statSync } = await import("fs");
      
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      if (existsSync(apkPath)) {
        const stats = statSync(apkPath);
        res.json({
          exists: true,
          filename: 'itv-obtv-firestick.apk',
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          downloadUrl: '/itv-obtv-firestick.apk'
        });
      } else {
        res.json({
          exists: false,
          filename: null,
          size: 0,
          lastModified: null,
          downloadUrl: null
        });
      }
    } catch (error) {
      console.error('Error checking APK info:', error);
      res.status(500).json({ error: 'Failed to get APK information' });
    }
  });

  app.post('/api/admin/apk/upload', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const multer = (await import('multer')).default;
      const { join } = await import("path");
      const { existsSync, mkdirSync } = await import("fs");
      
      const publicDir = join(process.cwd(), 'server', 'public');
      if (!existsSync(publicDir)) {
        mkdirSync(publicDir, { recursive: true });
      }
      
      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, publicDir);
        },
        filename: (req, file, cb) => {
          cb(null, 'itv-obtv-firestick.apk');
        }
      });
      
      const upload = multer({
        storage,
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
        fileFilter: (req, file, cb) => {
          if (file.originalname.endsWith('.apk') || file.mimetype === 'application/vnd.android.package-archive') {
            cb(null, true);
          } else {
            cb(new Error('Only APK files are allowed'));
          }
        }
      }).single('apk');
      
      upload(req, res, (err) => {
        if (err) {
          console.error('APK upload error:', err);
          return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'No APK file provided' });
        }
        
        res.json({
          success: true,
          filename: req.file.filename,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Error uploading APK:', error);
      res.status(500).json({ error: 'Failed to upload APK' });
    }
  });

  app.delete('/api/admin/apk', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { join } = await import("path");
      const { existsSync, unlinkSync } = await import("fs");
      
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      if (existsSync(apkPath)) {
        unlinkSync(apkPath);
        res.json({ success: true, message: 'APK file deleted successfully' });
      } else {
        res.status(404).json({ error: 'APK file not found' });
      }
    } catch (error) {
      console.error('Error deleting APK:', error);
      res.status(500).json({ error: 'Failed to delete APK' });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve APK file directly - MUST be BEFORE static middleware to avoid catch-all route
  app.get('/itv-obtv-firestick.apk', async (req, res, next) => {
    try {
      const { join } = await import("path");
      const { existsSync, statSync } = await import("fs");
      
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      console.log(`APK download requested by User-Agent: ${req.get('User-Agent') || 'Unknown'} IP: ${req.ip}`);
      
      if (existsSync(apkPath)) {
        const stats = statSync(apkPath);
        
        // Set headers for maximum mobile downloader compatibility
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="itv-obtv-firestick.apk"');
        res.setHeader('Content-Length', stats.size.toString());
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        
        console.log(`Serving APK file: ${stats.size} bytes`);
        
        // Use sendFile for better streaming support
        res.sendFile(apkPath);
      } else {
        console.log('APK file not found at:', apkPath);
        res.status(404).send('APK file not found');
      }
    } catch (error) {
      console.error('Error serving APK:', error);
      res.status(500).send('Failed to serve APK file');
    }
  });

  // Only serve static files in production (no vite imports)
  serveStatic(app);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();