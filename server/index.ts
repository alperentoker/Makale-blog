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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Disable X-Powered-By header (Information disclosure prevention)
app.disable('x-powered-by');

// 2. Trust reverse proxy (Nginx) for correct client IP detection
app.set('trust proxy', 1);

// 3. Security Headers Middleware (Defense-in-depth across all endpoints)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 4. Block access to hidden/dotfiles (.env, .git, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/.') || req.path.includes('/.')) {
    res.status(403).json({ error: 'Erişim engellendi.' });
    return;
  }
  next();
});

// Standard Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(authenticateUser);

// SEO Routes at root: /sitemap.xml & /robots.txt
app.use('/', seoRouter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);

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

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler (Masks sensitive details in production)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[LENS Server Error]', err);
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  res.status(statusCode).json({
    error: isProduction && statusCode === 500 ? 'Sunucu hatası oluştu.' : (err.message || 'Sunucu hatası oluştu.'),
  });
});

// Periodic cleanup of expired sessions (every 1 hour)
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`[LENS CMS API] Server running on http://127.0.0.1:${PORT}`);
});

export default app;
