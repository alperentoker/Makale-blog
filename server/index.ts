import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { db } from './db.ts';
import { authenticateUser, cleanExpiredSessions } from './auth.ts';
import { authRouter } from './routes/auth.ts';
import { articlesRouter } from './routes/articles.ts';
import { seoRouter } from './routes/seo.ts';
import { configureTrustProxy } from './net.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Disable X-Powered-By header (Information disclosure prevention)
app.disable('x-powered-by');

// 2. Trust only our own reverse proxies (local Nginx and Cloudflare edge IPs).
// A numeric trust proxy would let clients spoof X-Forwarded-For and evade
// per-IP brute-force lockouts.
configureTrustProxy(app);

// 3. Security Headers Middleware (Defense-in-depth across all endpoints)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Self-hosted, subresource-integrity-free SPA: forbid framing, plugins and
  // cross-origin embeddings entirely.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

import { uploadRouter } from './routes/upload.ts';

// 4. Block access to hidden/dotfiles (.env, .git, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/.') || req.path.includes('/.')) {
    res.status(403).json({ error: 'Erişim engellendi.' });
    return;
  }
  next();
});

// 5. CSRF & Mutation Origin Verification Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  if (!isMutation) return next();

  // Allow requests containing custom header or matching origin
  const customHeader = req.headers['x-requested-with'] || req.headers['x-lens-csrf'];
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (customHeader) {
    return next();
  }

  if (origin && host) {
    const originHost = origin.replace(/^https?:\/\//i, '');
    if (originHost === host) {
      return next();
    }
  }

  // Allow localhost during development or test
  if (process.env.NODE_ENV !== 'production' || !origin) {
    return next();
  }

  res.status(403).json({ error: 'CSRF koruması: Geçersiz veya eksik doğrulama başlığı.' });
});

// Standard Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(authenticateUser);

// Static Uploads Serving
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    // Uploaded SVGs are sanitized on write; this CSP adds a second layer so a
    // served SVG can never execute scripts or load external resources.
    if (filePath.toLowerCase().endsWith('.svg')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
  },
}));

// SEO Routes at root: /sitemap.xml & /robots.txt
app.use('/', seoRouter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/upload', uploadRouter);

// Healthcheck Route (Public returns only status; detailed metrics restricted to authenticated admin)
app.get('/api/health', (req: Request, res: Response) => {
  try {
    // Quick DB connectivity check
    db.prepare('SELECT 1').get();

    if (req.authenticated) {
      const row = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
      res.json({
        status: 'ok',
        authenticated: true,
        uptime: process.uptime(),
        articlesCount: row.count,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error' });
  }
});

// Production: Serve static build if dist folder exists and configured
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath) && process.env.SERVE_STATIC === 'true') {
  console.log(`[LENS CMS] Serving static files from ${distPath}`);
  app.use(express.static(distPath));

  app.get('{*splat}', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'), { dotfiles: 'allow' });
  });
}

// Global Error Handler (masks internal details, including raw JSON parse messages)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[LENS Server Error]', err);
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && (err as any).status === 400)) {
    res.status(400).json({ error: 'Geçersiz istek gövdesi.' });
    return;
  }

  if (isProduction) {
    // Never leak internal messages (paths, parser output, stack hints) in production.
    res.status(statusCode).json({
      error: statusCode >= 500 ? 'Sunucu hatası oluştu.' : (err.expose ? err.message : 'Geçersiz istek.'),
    });
    return;
  }

  res.status(statusCode).json({ error: err.message || 'Sunucu hatası oluştu.' });
});

// Periodic cleanup of expired sessions (every 1 hour)
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`[LENS CMS API] Server running on http://127.0.0.1:${PORT}`);
});

export default app;
