import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

// Extend Express Request to include authenticated flag
declare global {
  namespace Express {
    interface Request {
      authenticated?: boolean;
    }
  }
}

const KEY_LEN = 64;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Hash password with unique salt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(32).toString('hex');
  const derivedKey = crypto.scryptSync(password, generatedSalt, KEY_LEN);
  return {
    hash: derivedKey.toString('hex'),
    salt: generatedSalt,
  };
}

// Timing-safe password verification
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, KEY_LEN);
    const hashBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== hashBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, hashBuffer);
  } catch {
    return false;
  }
}

// Check if master password has been set
export function isMasterPasswordSet(): boolean {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'master_password_hash'").get();
  return !!row;
}

// Set initial master password
export function setMasterPassword(password: string): boolean {
  const { hash, salt } = hashPassword(password);
  const setHash = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('master_password_hash', ?)");
  const setSalt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('master_password_salt', ?)");

  const tx = db.transaction(() => {
    setHash.run(hash);
    setSalt.run(salt);
  });
  tx();
  return true;
}

// Verify credentials against stored master password
export function verifyMasterPassword(password: string): boolean {
  const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'master_password_hash'").get() as { value?: string } | undefined;
  const saltRow = db.prepare("SELECT value FROM settings WHERE key = 'master_password_salt'").get() as { value?: string } | undefined;

  if (!hashRow?.value || !saltRow?.value) {
    return false;
  }

  return verifyPassword(password, hashRow.value, saltRow.value);
}

// Create new session token in DB
export function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  db.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)').run(token, now, expiresAt);
  return token;
}

// Invalidate session token
export function destroySession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Clean up expired sessions periodically
export function cleanExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

// Check IP Rate limit for brute-force protection
export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number; attempts: number } {
  const now = Date.now();
  const row = db.prepare('SELECT attempts, lockout_until, last_attempt FROM rate_limits WHERE ip = ?').get(ip) as {
    attempts: number;
    lockout_until: number;
    last_attempt: number;
  } | undefined;

  if (!row) {
    return { allowed: true, attempts: 0 };
  }

  // Active lockout check
  if (row.lockout_until > now) {
    const retryAfter = Math.ceil((row.lockout_until - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter, attempts: row.attempts };
  }

  // If last attempt was more than 1 hour ago, reset count
  if (now - row.last_attempt > 3600 * 1000) {
    db.prepare('DELETE FROM rate_limits WHERE ip = ?').run(ip);
    return { allowed: true, attempts: 0 };
  }

  return { allowed: true, attempts: row.attempts };
}

// Record a failed login attempt
export function recordFailedAttempt(ip: string): { attempts: number; lockoutSeconds: number } {
  const now = Date.now();
  const current = db.prepare('SELECT attempts FROM rate_limits WHERE ip = ?').get(ip) as { attempts: number } | undefined;
  const attempts = (current?.attempts || 0) + 1;

  let lockoutUntil = 0;
  let lockoutSeconds = 0;

  if (attempts >= 10) {
    lockoutSeconds = 15 * 60; // 15 minutes lockout
    lockoutUntil = now + lockoutSeconds * 1000;
  } else if (attempts >= 5) {
    lockoutSeconds = 60; // 1 minute cooldown
    lockoutUntil = now + lockoutSeconds * 1000;
  }

  db.prepare(`
    INSERT INTO rate_limits (ip, attempts, lockout_until, last_attempt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ip) DO UPDATE SET
      attempts = excluded.attempts,
      lockout_until = excluded.lockout_until,
      last_attempt = excluded.last_attempt
  `).run(ip, attempts, lockoutUntil, now);

  return { attempts, lockoutSeconds };
}

// Reset failed attempts on successful login
export function resetRateLimit(ip: string): void {
  db.prepare('DELETE FROM rate_limits WHERE ip = ?').run(ip);
}

// Middleware: Authenticate user from HttpOnly cookie or Authorization Bearer header
export function authenticateUser(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.lens_session;
  const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken;

  if (!token) {
    req.authenticated = false;
    return next();
  }

  const session = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token) as { expires_at: number } | undefined;

  if (session && session.expires_at > Date.now()) {
    req.authenticated = true;
  } else {
    req.authenticated = false;
  }

  next();
}

// Middleware: Strict guard for Admin routes
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authenticated) {
    res.status(401).json({
      error: 'Yetkisiz erişim. Yönetici oturumu gereklidir.',
      authenticated: false,
    });
    return;
  }
  next();
}
