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

// Trust reverse proxy (Nginx) for correct client IP detection
app.set('trust proxy', 1);

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

// Healthcheck Route
app.get('/api/health', (_req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
    res.json({
      status: 'ok',
      service: 'lens-cms-api',
      uptime: process.uptime(),
      articlesCount: row.count,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
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

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[LENS Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Sunucu hatası oluştu.',
  });
});

// Periodic cleanup of expired sessions (every 1 hour)
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`[LENS CMS API] Server running on http://127.0.0.1:${PORT}`);
});

export default app;
