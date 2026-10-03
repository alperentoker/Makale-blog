import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import type Database from 'better-sqlite3';
import type { AppConfig } from './config.ts';

const COOKIE = 'lens_sid';

const LOCKOUTS = [
  { attempts: 5, lockoutMs: 30_000 },
  { attempts: 10, lockoutMs: 300_000 },
  { attempts: 20, lockoutMs: 900_000 },
];

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function lockoutMs(attempts: number): number {
  let duration = 0;
  for (const t of LOCKOUTS) {
    if (attempts >= t.attempts) duration = t.lockoutMs;
  }
  return duration;
}

export async function ensureAdmin(db: Database.Database, config: AppConfig): Promise<void> {
  const existing = db.prepare(`SELECT id FROM admin WHERE id = 1`).get();
  if (existing) return;
  if (!config.adminPassword || config.adminPassword.length < config.minPasswordLength) {
    throw new Error(
      `ADMIN_PASSWORD en az ${config.minPasswordLength} karakter olmalı (ilk kurulum).`,
    );
  }
  const password_hash = await argon2.hash(config.adminPassword, { type: argon2.argon2id });
  db.prepare(`INSERT INTO admin (id, password_hash, updated_at) VALUES (1, ?, ?)`).run(
    password_hash,
    new Date().toISOString(),
  );
}

export function clientIp(req: Request, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

export function remainingLockout(db: Database.Database, ip: string): number {
  const row = db.prepare(`SELECT lockout_until FROM login_attempts WHERE ip = ?`).get(ip) as
    | { lockout_until: number }
    | undefined;
  if (!row) return 0;
  return Math.max(0, row.lockout_until - Date.now());
}

export async function verifyLogin(
  db: Database.Database,
  config: AppConfig,
  ip: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string; status: number }> {
  const wait = remainingLockout(db, ip);
  if (wait > 0) {
    return {
      ok: false,
      status: 429,
      message: `Çok fazla başarısız deneme. ${Math.ceil(wait / 1000)} saniye bekleyin.`,
    };
  }

  const admin = db.prepare(`SELECT password_hash FROM admin WHERE id = 1`).get() as
    | { password_hash: string }
    | undefined;
  if (!admin) {
    return { ok: false, status: 503, message: 'Yönetici hesabı yapılandırılmamış.' };
  }

  const valid = await argon2.verify(admin.password_hash, password).catch(() => false);
  if (!valid) {
    const current = db.prepare(`SELECT failed_count FROM login_attempts WHERE ip = ?`).get(ip) as
      | { failed_count: number }
      | undefined;
    const failed = (current?.failed_count ?? 0) + 1;
    const lock = lockoutMs(failed);
    db.prepare(
      `INSERT INTO login_attempts (ip, failed_count, lockout_until) VALUES (?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET failed_count = excluded.failed_count, lockout_until = excluded.lockout_until`,
    ).run(ip, failed, lock > 0 ? Date.now() + lock : 0);
    return { ok: false, status: 401, message: 'Geçersiz yönetici parolası.' };
  }

  db.prepare(`DELETE FROM login_attempts WHERE ip = ?`).run(ip);
  const token = randomBytes(32).toString('hex');
  const token_hash = hashToken(token);
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (token_hash, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?)`,
  ).run(token_hash, new Date().toISOString(), now + config.sessionTtlMs, now);
  return { ok: true, token };
}

export function readSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function getSession(db: Database.Database, token: string | null): boolean {
  if (!token) return false;
  const token_hash = hashToken(token);
  const row = db
    .prepare(`SELECT expires_at FROM sessions WHERE token_hash = ?`)
    .get(token_hash) as { expires_at: number } | undefined;
  if (!row || row.expires_at < Date.now()) {
    if (row) db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(token_hash);
    return false;
  }
  db.prepare(`UPDATE sessions SET last_seen = ? WHERE token_hash = ?`).run(Date.now(), token_hash);
  return true;
}

export function destroySession(db: Database.Database, token: string | null): void {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
}

export function sessionCookie(token: string, config: AppConfig, maxAgeSec: number): string {
  const parts = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (config.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(config: AppConfig): string {
  return sessionCookie('deleted', config, 0);
}

export async function changePassword(
  db: Database.Database,
  config: AppConfig,
  current: string,
  next: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!next || next.length < config.minPasswordLength) {
    return { ok: false, message: `Yeni parola en az ${config.minPasswordLength} karakter olmalıdır.` };
  }
  const admin = db.prepare(`SELECT password_hash FROM admin WHERE id = 1`).get() as
    | { password_hash: string }
    | undefined;
  if (!admin) return { ok: false, message: 'Yönetici hesabı yok.' };
  const valid = await argon2.verify(admin.password_hash, current).catch(() => false);
  if (!valid) return { ok: false, message: 'Mevcut parola yanlış.' };
  const password_hash = await argon2.hash(next, { type: argon2.argon2id });
  db.prepare(`UPDATE admin SET password_hash = ?, updated_at = ? WHERE id = 1`).run(
    password_hash,
    new Date().toISOString(),
  );
  db.prepare(`DELETE FROM sessions`).run();
  return { ok: true };
}

export function originAllowed(req: Request, config: AppConfig): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  if (origin) return origin.replace(/\/$/, '') === config.publicOrigin;
  if (referer) {
    try {
      return new URL(referer).origin === config.publicOrigin;
    } catch {
      return false;
    }
  }
  // Same-origin non-browser clients (tests) without Origin
  return true;
}

export function timingPad(): Promise<void> {
  const ms = 250 + Math.floor(Math.random() * 200);
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
