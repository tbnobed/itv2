import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { insertStreamSchema, updateStreamSchema, insertStudioSchema, updateStudioSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, requireAuth, requireAdmin, csrfProtection } from "./auth";
import { SnapshotService } from "./SnapshotService";
import { join } from "path";
import { existsSync, statSync, renameSync, unlinkSync } from "fs";
import multer from "multer";
import { promisify } from "util";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes first
  setupAuth(app);
  
  // Initialize SnapshotService
  const snapshotService = SnapshotService.getInstance();
  
  // Configure multer for APK file uploads
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = join(process.cwd(), 'server', 'public');
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Use temporary filename first, then rename after validation
      cb(null, `temp-${Date.now()}.apk`);
    }
  });
  
  const upload = multer({
    storage: storage_config,
    fileFilter: (req, file, cb) => {
      // Only accept .apk files
      if (file.mimetype === 'application/vnd.android.package-archive' || 
          file.originalname.toLowerCase().endsWith('.apk')) {
        cb(null, true);
      } else {
        cb(new Error('Only APK files are allowed'));
      }
    },
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
      files: 1
    }
  });
  
  // Serve static snapshot files
  const snapshotsPath = join(process.cwd(), 'server', 'public', 'snapshots');
  app.use('/snapshots', express.static(snapshotsPath, {
    maxAge: 0, // No caching
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store');
    }
  }));
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const activeWorkers = snapshotService.getActiveWorkerCount();
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      snapshotWorkers: activeWorkers
    });
  });
  
  // Utility function to format file sizes
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

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

  // Snapshot endpoints for server-side preview generation
  app.get('/api/streams/:id/snapshot', (req, res) => {
    try {
      const { id } = req.params;
      const snapshotPath = snapshotService.getSnapshotPath(id);
      
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

  // APK management endpoints (admin only)
  app.get('/api/admin/apk/info', requireAdmin, async (req, res) => {
    try {
      // Prevent caching for admin endpoints to avoid 304 responses
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      if (!existsSync(apkPath)) {
        return res.json({
          exists: false,
          message: 'No APK file currently uploaded'
        });
      }
      
      const stats = statSync(apkPath);
      
      res.json({
        exists: true,
        filename: 'itv-obtv-firestick.apk',
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        lastModified: stats.mtime.toISOString(),
        lastModifiedFormatted: stats.mtime.toLocaleString()
      });
    } catch (error) {
      console.error('Error getting APK info:', error);
      res.status(500).json({ error: 'Failed to get APK file information' });
    }
  });

  app.post('/api/admin/apk/upload', requireAdmin, csrfProtection, upload.single('apk'), async (req, res) => {
    let tempFilePath: string | undefined;
    
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No APK file uploaded' });
      }
      
      tempFilePath = file.path;
      const targetPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      // Validate file size
      if (file.size === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB
        return res.status(400).json({ error: 'File size exceeds 100MB limit' });
      }
      
      // Validate file extension
      if (!file.originalname.toLowerCase().endsWith('.apk')) {
        return res.status(400).json({ error: 'File must have .apk extension' });
      }
      
      // Remove existing APK file if it exists
      if (existsSync(targetPath)) {
        try {
          unlinkSync(targetPath);
        } catch (unlinkError) {
          console.warn('Could not remove existing APK file:', unlinkError);
          // Continue with upload - the rename should overwrite
        }
      }
      
      // Move temp file to final destination
      renameSync(tempFilePath, targetPath);
      tempFilePath = undefined; // Clear reference since file is now moved
      
      // Get file stats for response
      const stats = statSync(targetPath);
      
      console.log(`APK file uploaded successfully: ${file.originalname} (${formatFileSize(file.size)})`);
      
      res.status(201).json({
        success: true,
        message: 'APK file uploaded successfully',
        filename: 'itv-obtv-firestick.apk',
        originalName: file.originalname,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        uploadedAt: new Date().toISOString()
      });
      
    } catch (error) {
      // Clean up temp file if upload failed
      if (tempFilePath && existsSync(tempFilePath)) {
        try {
          unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
      
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 100MB limit' });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Only one file allowed' });
        } else {
          return res.status(400).json({ error: `Upload error: ${error.message}` });
        }
      }
      
      console.error('Error uploading APK file:', error);
      res.status(500).json({ error: 'Failed to upload APK file' });
    }
  });

  // Dynamic APK file serving endpoint with proper HTTP caching and HEAD support
  const handleApkDownload = (req: express.Request, res: express.Response) => {
    try {
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      // Check if APK file exists
      if (!existsSync(apkPath)) {
        return res.status(404).json({ error: 'APK file not found' });
      }
      
      // Get file stats for proper headers
      const stats = statSync(apkPath);
      const lastModified = stats.mtime.toUTCString();
      const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
      
      // Handle conditional requests (304 Not Modified)
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];
      
      if (ifNoneMatch && ifNoneMatch === etag) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', etag);
        return res.status(304).end();
      }
      
      if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', etag);
        return res.status(304).end();
      }
      
      // Set appropriate headers for APK download
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="OBTV-FireStick.apk"');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('Last-Modified', lastModified);
      res.setHeader('ETag', etag);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Handle HEAD requests
      if (req.method === 'HEAD') {
        return res.end();
      }
      
      // Stream the file to the response for GET requests
      res.sendFile(apkPath);
    } catch (error) {
      console.error('Error serving APK file:', error);
      res.status(500).json({ error: 'Failed to serve APK file' });
    }
  };
  
  app.route('/api/download/firestick-apk')
    .get(handleApkDownload)
    .head(handleApkDownload);

  // Static file serving for snapshots (generated by SnapshotService)
  const snapshotsDir = join(process.cwd(), 'server', 'public', 'snapshots');
  app.use('/snapshots', express.static(snapshotsDir, {
    maxAge: '30s', // Cache snapshots for 30 seconds (matches update rate)
    etag: false,   // Disable ETags since we use timestamp cache busting
    index: false   // Don't serve directory listings
  }));

  const httpServer = createServer(app);

  return httpServer;
}
