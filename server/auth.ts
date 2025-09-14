import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";

// Database-stored users with passcode authentication
// Each user in the database has a hashed passcode as their password
const sessionUsers = new Map<string, { id: string; username: string; role: 'admin' | 'user' }>();

export function setupAuth(app: Express) {
  // Simple session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'obtv-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // HTTP in Replit dev
      sameSite: 'lax'
    }
  }));

  // Login endpoint - authenticates against database users
  app.post('/api/login', async (req, res) => {
    const { passcode } = req.body;
    
    if (!passcode || passcode.length !== 4) {
      return res.status(400).json({ error: 'Valid 4-digit passcode required' });
    }

    try {
      // Get all users from database
      const users = await storage.getAllUsers();
      
      // Check passcode against each user's hashed password
      for (const user of users) {
        const isValid = await bcrypt.compare(passcode, user.password);
        
        if (isValid && user.isActive === 'true') {
          // Store user in session
          const sessionUser = { 
            id: user.id, 
            username: user.username, 
            role: user.role 
          };
          sessionUsers.set(req.session.id, sessionUser);
          
          return res.json(sessionUser);
        }
      }
      
      // No matching user found
      return res.status(401).json({ error: 'Invalid passcode' });
      
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // Check current user
  app.get('/api/user', (req, res) => {
    const user = sessionUsers.get(req.session.id || '');
    if (user) {
      return res.json(user);
    }
    return res.status(401).json({ error: 'Not authenticated' });
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    if (req.session.id) {
      sessionUsers.delete(req.session.id);
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      return res.json({ success: true });
    });
  });
}

// Middleware to require admin authentication
export function requireAdmin(req: any, res: any, next: any) {
  const user = sessionUsers.get(req.session?.id || '');
  
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  
  req.user = user;
  next();
}

// Middleware to require any authentication
export function requireAuth(req: any, res: any, next: any) {
  const user = sessionUsers.get(req.session?.id || '');
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.user = user;
  next();
}