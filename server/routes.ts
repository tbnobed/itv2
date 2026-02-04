import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, seedDatabase } from "./storage";
import { insertStreamSchema, updateStreamSchema, insertStudioSchema, updateStudioSchema, insertUserSchema, uploadApkSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, requireAuth, requireAdmin, csrfProtection } from "./auth";
import { SnapshotService } from "./SnapshotService";
import { join } from "path";
import { existsSync, statSync, renameSync, unlinkSync, readFileSync } from "fs";
import multer from "multer";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { ObjectStorageService, registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// APK validation function to prevent MIME spoofing
function validateAPKFile(filePath: string): { isValid: boolean; error?: string } {
  try {
    const fullBuffer = readFileSync(filePath);
    
    // Check ZIP magic bytes (APK files are ZIP files)
    if (fullBuffer[0] !== 0x50 || fullBuffer[1] !== 0x4B) {
      return { isValid: false, error: 'File is not a valid ZIP/APK format (missing ZIP magic bytes)' };
    }
    
    // Check for specific ZIP file signatures
    if (!(fullBuffer[2] === 0x03 && fullBuffer[3] === 0x04) && // Regular ZIP file
        !(fullBuffer[2] === 0x05 && fullBuffer[3] === 0x06) && // Empty ZIP
        !(fullBuffer[2] === 0x07 && fullBuffer[3] === 0x08)) { // Spanned ZIP
      return { isValid: false, error: 'File has invalid ZIP file signature' };
    }
    
    // Search entire file for AndroidManifest.xml (central directory is at END of ZIP)
    const content = fullBuffer.toString('binary');
    if (!content.includes('AndroidManifest.xml') && 
        !content.includes('META-INF/') &&
        !content.includes('classes.dex')) {
      return { isValid: false, error: 'File does not appear to be a valid APK (missing Android manifest or dex files)' };
    }
    
    return { isValid: true };
  } catch (error: any) {
    return { isValid: false, error: `Failed to validate APK file: ${error?.message || 'Unknown error'}` };
  }
}

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
      
      // Calculate actual stream counts for each studio
      const studiosWithCounts = await Promise.all(
        studios.map(async (studio) => {
          const streams = await storage.getStreamsByStudio(studio.id);
          return {
            ...studio,
            feedCount: streams.length
          };
        })
      );
      
      res.json(studiosWithCounts);
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
      
      // Check if passcode is already in use by another user
      const passcodeInUse = await storage.isPasscodeInUse(validatedData.password);
      if (passcodeInUse) {
        return res.status(400).json({ error: 'This access code is already in use. Please choose a different 4-digit code.' });
      }
      
      // Hash the password before storing (with pepper for security)
      const PASSCODE_PEPPER = process.env.PASSCODE_PEPPER || 'obtv-universal-pepper-change-in-production';
      const pepperedPassword = validatedData.password + PASSCODE_PEPPER;
      const hashedPassword = await bcrypt.hash(pepperedPassword, 12);
      
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

  app.put('/api/admin/users/:id/password', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password || typeof password !== 'string' || password.length !== 4 || !/^\d{4}$/.test(password)) {
        return res.status(400).json({ error: 'Password must be a 4-digit code' });
      }
      
      // Check if passcode is already in use by another user (excluding current user)
      const passcodeInUse = await storage.isPasscodeInUse(password, id);
      if (passcodeInUse) {
        return res.status(400).json({ error: 'This access code is already in use. Please choose a different 4-digit code.' });
      }
      
      // Hash with pepper for security (must match login verification)
      const PASSCODE_PEPPER = process.env.PASSCODE_PEPPER || 'obtv-universal-pepper-change-in-production';
      const pepperedPassword = password + PASSCODE_PEPPER;
      const hashedPassword = await bcrypt.hash(pepperedPassword, 10);
      const updated = await storage.updateUserPassword(id, hashedPassword);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user password:', error);
      res.status(500).json({ error: 'Failed to update user password' });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user as any;
      
      // Prevent self-deletion
      if (currentUser.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Public APK version check endpoint (for app self-update)
  app.get('/api/version', async (req, res) => {
    try {
      const activeVersion = await storage.getActiveApkVersion();
      
      if (!activeVersion) {
        return res.status(404).json({ 
          versionName: "0.0.0",
          versionCode: 0,
          downloadUrl: "",
          releaseNotes: "No APK available"
        });
      }
      
      // Get host from request for absolute download URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['host'] || 'itv2.obtv.io';
      const downloadUrl = `${protocol}://${host}/api/download/firestick-apk`;
      
      res.json({
        versionName: activeVersion.versionName,
        versionCode: activeVersion.versionCode,
        downloadUrl: downloadUrl,
        releaseNotes: activeVersion.releaseNotes || `Version ${activeVersion.versionName}`
      });
    } catch (error) {
      console.error('Error checking APK version:', error);
      res.status(500).json({ error: 'Failed to check APK version' });
    }
  });

  // APK management endpoints (admin only)
  app.get('/api/admin/apk/info', requireAdmin, async (req, res) => {
    try {
      const activeVersion = await storage.getActiveApkVersion();
      
      let payload: any;
      if (!activeVersion) {
        payload = {
          exists: false,
          message: 'No APK file currently uploaded'
        };
      } else {
        payload = {
          exists: true,
          filename: 'OBTV-FireStick.apk',
          size: activeVersion.fileSize,
          sizeFormatted: formatFileSize(activeVersion.fileSize),
          versionName: activeVersion.versionName,
          versionCode: activeVersion.versionCode,
          releaseNotes: activeVersion.releaseNotes,
          lastModified: activeVersion.createdAt,
          lastModifiedFormatted: new Date(activeVersion.createdAt).toLocaleString()
        };
      }
      
      // Force unique content every single request
      payload.timestamp = Date.now();
      payload.requestId = Math.random().toString(36).slice(2);
      
      res.status(200);
      res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.json(payload);
    } catch (error) {
      console.error('Error getting APK info:', error);
      res.status(500).json({ error: 'Failed to get APK file information' });
    }
  });

  app.post('/api/admin/apk/upload', requireAdmin, csrfProtection, upload.single('apk'), async (req, res) => {
    let tempFilePath: string | undefined;
    
    console.log('APK UPLOAD STARTED');
    
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No APK file uploaded' });
      }
      
      // Parse version info from form data
      const versionName = req.body.versionName || '1.0.0';
      const versionCode = parseInt(req.body.versionCode) || 1;
      const releaseNotes = req.body.releaseNotes || '';
      
      console.log('Version info:', { versionName, versionCode, releaseNotes });
      
      tempFilePath = file.path;
      
      // Validate file size
      if (file.size === 0) {
        try { unlinkSync(tempFilePath); } catch (e) {}
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }
      
      if (file.size > 100 * 1024 * 1024) {
        try { unlinkSync(tempFilePath); } catch (e) {}
        return res.status(400).json({ error: 'File size exceeds 100MB limit' });
      }
      
      if (!file.originalname.toLowerCase().endsWith('.apk')) {
        try { unlinkSync(tempFilePath); } catch (e) {}
        return res.status(400).json({ error: 'File must have .apk extension' });
      }
      
      // Validate APK file structure
      const validation = validateAPKFile(tempFilePath);
      if (!validation.isValid) {
        try { unlinkSync(tempFilePath); } catch (e) {}
        return res.status(400).json({ error: validation.error });
      }
      
      // Upload to object storage
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/apk/OBTV-FireStick-v${versionCode}.apk`;
      
      // For now, also save to local filesystem for backward compatibility
      // until object storage upload is fully implemented
      const targetPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      renameSync(tempFilePath, targetPath);
      tempFilePath = undefined;
      
      // Save version metadata to database
      const apkVersion = await storage.createApkVersion({
        versionName,
        versionCode,
        releaseNotes,
        objectPath: targetPath, // Use local path for now
        fileSize: file.size,
        isActive: 'true'
      });
      
      console.log(`APK UPLOAD SUCCESSFUL: v${versionName} (${versionCode})`);
      
      res.status(201).json({
        success: true,
        message: 'APK file uploaded successfully',
        filename: 'OBTV-FireStick.apk',
        versionName: apkVersion.versionName,
        versionCode: apkVersion.versionCode,
        releaseNotes: apkVersion.releaseNotes,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        uploadedAt: apkVersion.createdAt
      });
      
    } catch (error: any) {
      console.error('Upload error:', error?.message);
      
      if (tempFilePath && existsSync(tempFilePath)) {
        try { unlinkSync(tempFilePath); } catch (e) {}
      }
      
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 100MB limit' });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
      res.status(500).json({ error: 'Failed to upload APK file' });
    }
  });

  // Dynamic APK file serving endpoint with proper HTTP caching and HEAD support
  const handleApkDownload = (req: express.Request, res: express.Response) => {
    console.log('📥 APK DOWNLOAD REQUEST STARTED');
    console.log('📋 Download Request Details:', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      origin: req.headers.origin,
      host: req.headers.host,
      protocol: req.protocol,
      secure: req.secure,
      ip: req.ip || req.connection.remoteAddress
    });
    
    try {
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      console.log('🗂️  Checking APK file:', apkPath);
      
      // Check if APK file exists
      if (!existsSync(apkPath)) {
        console.log('❌ DOWNLOAD FAILED - APK file not found at path:', apkPath);
        return res.status(404).json({ error: 'APK file not found' });
      }
      
      // Get file stats for proper headers
      const stats = statSync(apkPath);
      const lastModified = stats.mtime.toUTCString();
      const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
      
      console.log('📊 APK File Stats:', {
        size: stats.size,
        sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        lastModified,
        etag
      });
      
      // Handle conditional requests (304 Not Modified)
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];
      
      console.log('🔍 Cache Headers Check:', {
        ifNoneMatch,
        ifModifiedSince,
        currentEtag: etag
      });
      
      if (ifNoneMatch && ifNoneMatch === etag) {
        console.log('✅ CACHE HIT - Returning 304 Not Modified (ETag match)');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', etag);
        return res.status(304).end();
      }
      
      if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
        console.log('✅ CACHE HIT - Returning 304 Not Modified (If-Modified-Since)');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', etag);
        return res.status(304).end();
      }
      
      console.log('🚀 Preparing APK download response...');
      
      // Set appropriate headers for APK download
      const headers = {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="OBTV-FireStick.apk"',
        'Content-Length': stats.size,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Last-Modified': lastModified,
        'ETag': etag,
        'X-Content-Type-Options': 'nosniff'
      };
      
      console.log('📤 Setting download headers:', headers);
      
      res.setHeader('Content-Type', headers['Content-Type']);
      res.setHeader('Content-Disposition', headers['Content-Disposition']);
      res.setHeader('Content-Length', headers['Content-Length']);
      res.setHeader('Cache-Control', headers['Cache-Control']);
      res.setHeader('Last-Modified', headers['Last-Modified']);
      res.setHeader('ETag', headers['ETag']);
      res.setHeader('X-Content-Type-Options', headers['X-Content-Type-Options']);
      
      // Handle HEAD requests
      if (req.method === 'HEAD') {
        console.log('✅ HEAD request - sending headers only');
        return res.end();
      }
      
      // Stream the file to the response for GET requests
      console.log('📁 Streaming APK file to client...');
      res.sendFile(apkPath);
      console.log('✅ APK download initiated successfully');
    } catch (error) {
      console.log('💥 DOWNLOAD EXCEPTION OCCURRED');
      console.error('🔴 Download error details:', {
        message: error?.message,
        stack: error?.stack,
        errorType: error?.constructor?.name
      });
      res.status(500).json({ error: 'Failed to serve APK file' });
    }
  };
  
  // Simplified public APK download endpoint
  app.get('/api/download/firestick-apk', (req, res) => {
    try {
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      if (!existsSync(apkPath)) {
        return res.status(404).json({ error: 'APK file not found' });
      }
      
      const stats = statSync(apkPath);
      
      // Set headers for APK download
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="OBTV-FireStick.apk"');
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('Last-Modified', stats.mtime.toUTCString());
      res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      console.log(`Public APK download: ${stats.size} bytes`);
      res.sendFile(apkPath);
    } catch (error) {
      console.error('Error serving public APK download:', error);
      res.status(500).json({ error: 'Failed to serve APK file' });
    }
  });

  // APK file deletion endpoint
  app.delete('/api/admin/apk', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const apkPath = join(process.cwd(), 'server', 'public', 'itv-obtv-firestick.apk');
      
      if (existsSync(apkPath)) {
        unlinkSync(apkPath);
        console.log('APK file deleted successfully');
        res.json({ success: true, message: 'APK file deleted successfully' });
      } else {
        res.status(404).json({ error: 'APK file not found' });
      }
    } catch (error) {
      console.error('Error deleting APK:', error);
      res.status(500).json({ error: 'Failed to delete APK' });
    }
  });

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
