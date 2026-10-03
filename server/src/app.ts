import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type Database from 'better-sqlite3';
import type { AppConfig } from './config.ts';
import { INITIAL_ARTICLES } from '../../src/data/mockArticles.ts';
import {
  deleteArticle,
  getArticle,
  listArticles,
  replaceAllArticles,
  upsertArticle,
  validateArticle,
  wipeArticles,
} from './articles.ts';
import {
  changePassword,
  clientIp,
  clearSessionCookie,
  destroySession,
  getSession,
  originAllowed,
  readSessionToken,
  sessionCookie,
  timingPad,
  verifyLogin,
} from './auth.ts';
import { deleteAllMedia, listMedia, mediaUsedBytes, saveMediaFile } from './media.ts';
import { injectArticleMeta, robotsTxt, sitemapXml } from './ssr.ts';

type Env = { Variables: { authed: boolean } };

export function createApp(db: Database.Database, config: AppConfig) {
  const app = new Hono<Env>();

  app.use('/api/*', async (c, next) => {
    if (!originAllowed(c.req.raw, config)) {
      return c.json({ message: 'Köken doğrulanamadı.' }, 403);
    }
    const token = readSessionToken(c.req.header('cookie'));
    c.set('authed', getSession(db, token));
    await next();
  });

  const requireAdmin: MiddlewareHandler<Env> = async (c, next) => {
    if (!c.get('authed')) return c.json({ message: 'Oturum gerekli.' }, 401);
    await next();
  };

  app.get('/api/health', c => {
    const articles = db.prepare(`SELECT COUNT(*) AS n FROM articles`).get() as { n: number };
    return c.json({
      ok: true,
      db: true,
      articles: articles.n,
      mediaBytes: mediaUsedBytes(db),
      mediaQuotaBytes: config.mediaQuotaBytes,
    });
  });

  app.get('/api/auth/me', c => {
    const admin = db.prepare(`SELECT id FROM admin WHERE id = 1`).get();
    return c.json({
      authenticated: c.get('authed'),
      setupRequired: !admin,
    });
  });

  app.post('/api/auth/login', async c => {
    await timingPad();
    const ip = clientIp(c.req.raw, config.trustProxy);
    let body: { password?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: 'Geçersiz JSON.' }, 400);
    }
    const result = await verifyLogin(db, config, ip, String(body.password ?? ''));
    if (!result.ok) return c.json({ message: result.message }, result.status);
    c.header('Set-Cookie', sessionCookie(result.token, config, Math.floor(config.sessionTtlMs / 1000)));
    return c.json({ ok: true });
  });

  app.post('/api/auth/logout', c => {
    destroySession(db, readSessionToken(c.req.header('cookie')));
    c.header('Set-Cookie', clearSessionCookie(config));
    return c.json({ ok: true });
  });

  app.post('/api/auth/password', requireAdmin, async c => {
    let body: { current?: string; next?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: 'Geçersiz JSON.' }, 400);
    }
    const result = await changePassword(db, config, String(body.current ?? ''), String(body.next ?? ''));
    if (!result.ok) return c.json({ message: result.message }, 400);
    c.header('Set-Cookie', clearSessionCookie(config));
    return c.json({ ok: true, message: 'Parola güncellendi. Yeniden giriş yapın.' });
  });

  app.get('/api/articles', c => {
    return c.json({ articles: listArticles(db, { publishedOnly: true }) });
  });

  app.get('/api/articles/:idOrSlug', c => {
    const article = getArticle(db, c.req.param('idOrSlug'));
    if (!article) return c.json({ message: 'Makale bulunamadı.' }, 404);
    if (article.status !== 'published' && !c.get('authed')) {
      return c.json({ message: 'Makale bulunamadı.' }, 404);
    }
    return c.json({ article });
  });

  app.get('/api/admin/articles', requireAdmin, c => {
    return c.json({ articles: listArticles(db) });
  });

  app.put('/api/admin/articles/:id', requireAdmin, async c => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: 'Geçersiz JSON.' }, 400);
    }
    const parsed = validateArticle(body);
    if (!parsed.ok) return c.json({ message: parsed.message }, 400);
    if (parsed.article.id !== c.req.param('id')) {
      return c.json({ message: 'Kimlik uyuşmuyor.' }, 400);
    }
    const clash = getArticle(db, parsed.article.slug);
    if (clash && clash.id !== parsed.article.id) {
      return c.json({ message: 'Bu slug başka bir makalede kullanılıyor.' }, 409);
    }
    return c.json({ article: upsertArticle(db, parsed.article) });
  });

  app.delete('/api/admin/articles/:id', requireAdmin, c => {
    if (!deleteArticle(db, c.req.param('id'))) {
      return c.json({ message: 'Makale bulunamadı.' }, 404);
    }
    return c.json({ ok: true });
  });

  app.post('/api/admin/import', requireAdmin, async c => {
    let body: { articles?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: 'Geçersiz JSON.' }, 400);
    }
    if (!Array.isArray(body.articles)) return c.json({ message: 'articles dizisi gerekli.' }, 400);
    const parsed = [];
    for (const item of body.articles) {
      const v = validateArticle(item);
      if (!v.ok) return c.json({ message: v.message }, 400);
      parsed.push(v.article);
    }
    replaceAllArticles(db, parsed);
    return c.json({ articles: listArticles(db) });
  });

  app.post('/api/admin/seed', requireAdmin, c => {
    replaceAllArticles(db, INITIAL_ARTICLES.map(stripFakeDoi));
    return c.json({ articles: listArticles(db) });
  });

  app.delete('/api/admin/articles', requireAdmin, c => {
    wipeArticles(db);
    return c.json({ ok: true });
  });

  app.get('/api/admin/media', requireAdmin, c => {
    return c.json({
      items: listMedia(db),
      usedBytes: mediaUsedBytes(db),
      quotaBytes: config.mediaQuotaBytes,
    });
  });

  app.post('/api/admin/media', requireAdmin, async c => {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File)) return c.json({ message: 'file alanı gerekli.' }, 400);
    const buf = Buffer.from(await file.arrayBuffer());
    const result = saveMediaFile(db, config, {
      name: file.name,
      type: file.type,
      size: buf.length,
      data: buf,
    });
    if (!result.ok) return c.json({ message: result.message }, result.status as 415);
    return c.json({ url: result.url, id: result.id });
  });

  app.get('/sitemap.xml', c => {
    return c.body(sitemapXml(listArticles(db), config), 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    });
  });

  app.get('/robots.txt', c => {
    return c.body(robotsTxt(config), 200, { 'Content-Type': 'text/plain; charset=utf-8' });
  });

  app.get('/uploads/:name', c => {
    const name = path.basename(c.req.param('name'));
    const full = path.join(config.uploadsDir, name);
    if (!full.startsWith(config.uploadsDir) || !fs.existsSync(full)) {
      return c.json({ message: 'Dosya yok.' }, 404);
    }
    const data = fs.readFileSync(full);
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : ext === '.gif' ? 'image/gif'
      : ext === '.pdf' ? 'application/pdf'
      : 'image/jpeg';
    return c.body(data, 200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  });

  app.get('*', c => {
    if (c.req.path.startsWith('/api/')) return c.json({ message: 'Not found' }, 404);
    const indexPath = path.join(config.distDir, 'index.html');
    const assetPath = path.join(config.distDir, c.req.path.replace(/^\/+/, ''));
    if (
      c.req.path !== '/' &&
      fs.existsSync(assetPath) &&
      fs.statSync(assetPath).isFile() &&
      !assetPath.endsWith('index.html')
    ) {
      const data = fs.readFileSync(assetPath);
      return c.body(data, 200, { 'Content-Type': guessMime(assetPath) });
    }
    if (!fs.existsSync(indexPath)) {
      return c.text('Frontend henüz derlenmedi. Geliştirmede Vite (5173) kullanın.', 503);
    }
    let html = fs.readFileSync(indexPath, 'utf8');
    const match = c.req.path.match(/^\/(?:article|makale)\/([^/]+)\/?$/);
    if (match) {
      const article = getArticle(db, decodeURIComponent(match[1]));
      if (article && (article.status === 'published' || c.get('authed'))) {
        html = injectArticleMeta(html, article, config);
      }
    }
    return c.html(html);
  });

  return app;
}

function stripFakeDoi<T extends { doi?: string }>(article: T): T {
  const doi = article.doi ?? '';
  if (doi.includes('CVPR.2026') || doi.includes('TPAMI.2026') || doi.includes('0000001')) {
    return { ...article, doi: undefined };
  }
  return article;
}

export function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM articles`).get() as { n: number };
  if (row.n > 0) return;
  replaceAllArticles(db, INITIAL_ARTICLES.map(stripFakeDoi));
}

function guessMime(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.json': 'application/json',
    '.mjs': 'text/javascript; charset=utf-8',
  };
  return map[ext] || 'application/octet-stream';
}

export { deleteAllMedia };
