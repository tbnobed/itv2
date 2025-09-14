import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";

// Simple passcode-based authentication
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';
const USER_PASSCODE = process.env.USER_PASSCODE || '1111';

// Current authenticated user per session
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

  // Login endpoint
  app.post('/api/login', (req, res) => {
    const { passcode } = req.body;
    
    if (!passcode) {
      return res.status(400).json({ error: 'Passcode required' });
    }

    let user;
    if (passcode === ADMIN_PASSCODE) {
      user = { 
        id: 'admin-id', 
        username: 'admin', 
        role: 'admin' as const 
      };
    } else if (passcode === USER_PASSCODE) {
      user = { 
        id: 'user-id', 
        username: 'user', 
        role: 'user' as const 
      };
    } else {
      return res.status(401).json({ error: 'Invalid passcode' });
    }

    // Store user in session
    sessionUsers.set(req.session.id, user);
    
    return res.json(user);
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