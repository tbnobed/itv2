import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";

// Database-stored users with passcode authentication
// Each user in the database has a hashed passcode as their password

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
    const { code } = req.body;
    
    if (!code || code.length !== 4) {
      return res.status(400).json({ error: 'Valid 4-digit passcode required' });
    }

    try {
      // Get all users from database
      const users = await storage.getAllUsers();
      
      // Check passcode against each user's hashed password
      for (const user of users) {
        const isValid = await bcrypt.compare(code, user.password);
        
        if (isValid && user.isActive === 'true') {
          // Store user directly in session
          req.session.user = { 
            id: user.id, 
            username: user.username, 
            role: user.role 
          };
          
          console.log('Login - storing user in session:', req.session.id);
          console.log('Login - user data:', req.session.user);
          
          return res.json(req.session.user);
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
    if (req.session.user) {
      return res.json(req.session.user);
    }
    return res.status(401).json({ error: 'Not authenticated' });
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
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
  console.log('Admin middleware - session ID:', req.session?.id);
  console.log('Admin middleware - session user:', req.session?.user);
  
  const user = req.session?.user;
  
  if (!user || user.role !== 'admin') {
    console.log('Admin middleware - FAILED - user:', user, 'role:', user?.role);
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  
  console.log('Admin middleware - SUCCESS - user has admin role');
  req.user = user;
  next();
}

// Middleware to require any authentication
export function requireAuth(req: any, res: any, next: any) {
  const user = req.session?.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.user = user;
  next();
}