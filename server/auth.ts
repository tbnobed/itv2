import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Extend session interface to include CSRF token
declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SALT_ROUNDS = 12;

// TV-friendly passcode authentication constants
const PASSCODE_PEPPER = process.env.PASSCODE_PEPPER || 'obtv-universal-pepper-change-in-production';
const UNIVERSAL_PASSCODE = process.env.UNIVERSAL_PASSCODE || '1234';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes

// Rate limiting store
interface PasscodeAttempt {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, PasscodeAttempt>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  // Convert MapIterator to array to avoid downlevel iteration issues
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, data] of entries) {
    if (now - data.lastAttempt > RATE_LIMIT_WINDOW && (!data.lockedUntil || now > data.lockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

// Passcode authentication functions
async function hashPasscode(code: string): Promise<string> {
  const pepperedCode = code + PASSCODE_PEPPER;
  return await bcrypt.hash(pepperedCode, SALT_ROUNDS);
}

async function verifyPasscode(suppliedCode: string): Promise<boolean> {
  const pepperedCode = suppliedCode + PASSCODE_PEPPER;
  const hashedExpected = await hashPasscode(UNIVERSAL_PASSCODE);
  return await bcrypt.compare(pepperedCode, hashedExpected);
}

// Rate limiting for passcode attempts
function checkRateLimit(identifier: string): { allowed: boolean; lockedUntil?: number; retryAfter?: number } {
  const now = Date.now();
  const attempts = rateLimitStore.get(identifier);
  
  if (!attempts) {
    return { allowed: true };
  }
  
  // Check if still locked out
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return { 
      allowed: false, 
      lockedUntil: attempts.lockedUntil,
      retryAfter: Math.ceil((attempts.lockedUntil - now) / 1000)
    };
  }
  
  // Reset if window expired
  if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
    rateLimitStore.delete(identifier);
    return { allowed: true };
  }
  
  // Check if max attempts exceeded
  if (attempts.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = attempts.lastAttempt + LOCKOUT_DURATION;
    attempts.lockedUntil = lockedUntil;
    return { 
      allowed: false, 
      lockedUntil,
      retryAfter: Math.ceil((lockedUntil - now) / 1000)
    };
  }
  
  return { allowed: true };
}

function recordAttempt(identifier: string, success: boolean): void {
  const now = Date.now();
  const attempts = rateLimitStore.get(identifier);
  
  if (success) {
    // Clear attempts on successful login
    rateLimitStore.delete(identifier);
    return;
  }
  
  if (!attempts) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      lastAttempt: now
    });
  } else {
    attempts.attempts += 1;
    attempts.lastAttempt = now;
  }
}

// Synthetic authenticated user for passcode authentication
const AUTHENTICATED_USER: SelectUser = {
  id: 'user',
  username: 'obtv-user',
  password: '' // Not used for passcode auth
};

// CSRF token generation and validation
function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

function validateCSRFToken(sessionToken: string, providedToken: string): boolean {
  if (!sessionToken || !providedToken) return false;
  return sessionToken === providedToken;
}

// CSRF middleware
export function csrfProtection(req: any, res: any, next: any) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const sessionToken = req.session.csrfToken;
  const providedToken = req.headers['x-csrf-token'] || req.body._csrf;

  if (!validateCSRFToken(sessionToken, providedToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'obtv-admin-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction, // Require HTTPS in production
      httpOnly: true,
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Handle synthetic authenticated user for passcode auth
      if (id === 'user') {
        done(null, AUTHENTICATED_USER);
        return;
      }
      
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Disabled registration endpoint (TV-friendly passcode auth only)
  app.post("/api/register", (req, res) => {
    res.status(404).json({ error: "Registration not available - use universal passcode authentication" });
  });

  // Legacy login endpoint (disabled for TV-friendly passcode auth)
  app.post("/api/login", (req, res) => {
    res.status(404).json({ error: "Use universal passcode authentication at /api/passcode-login" });
  });
  
  // TV-friendly universal passcode authentication endpoint
  app.post("/api/passcode-login", async (req, res, next) => {
    const identifier = req.session.id || req.ip || 'unknown';
    
    try {
      // Validate input
      const { code } = req.body;
      if (!code || typeof code !== 'string' || !/^\d{4}$/.test(code)) {
        recordAttempt(identifier, false);
        return res.status(400).json({ error: "Invalid passcode format" });
      }
      
      // Check rate limiting
      const rateCheck = checkRateLimit(identifier);
      if (!rateCheck.allowed) {
        console.log(`Passcode attempt blocked for ${identifier}: locked until ${rateCheck.lockedUntil}`);
        return res.status(429).json({ 
          error: "Too many attempts. Try again later.",
          retryAfter: rateCheck.retryAfter
        });
      }
      
      // Verify passcode
      const isValid = await verifyPasscode(code);
      recordAttempt(identifier, isValid);
      
      if (!isValid) {
        console.log(`Invalid passcode attempt from ${identifier}`);
        return res.status(401).json({ error: "Invalid passcode" });
      }
      
      // Successful authentication - log in authenticated user
      req.login(AUTHENTICATED_USER, (loginErr) => {
        if (loginErr) {
          console.error("User login error:", loginErr);
          return res.status(500).json({ error: "Authentication failed" });
        }
        
        console.log(`Successful user login from ${identifier}`);
        res.status(200).json({ id: AUTHENTICATED_USER.id, username: AUTHENTICATED_USER.username });
      });
      
    } catch (error) {
      console.error("Passcode authentication error:", error);
      recordAttempt(identifier, false);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json({ id: req.user.id, username: req.user.username });
  });

  // CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Generate CSRF token for authenticated sessions
  app.use((req, res, next) => {
    if (req.isAuthenticated() && !req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    next();
  });
}

// Authentication middleware to protect all routes
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}