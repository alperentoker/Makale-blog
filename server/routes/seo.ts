import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

export const seoRouter = Router();

// Helper to resolve site URL dynamically matching incoming request or configured environment
function getSiteUrl(req: Request): string {
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
  if (host) {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    return `${proto}://${host}`;
  }
  return (process.env.SITE_URL || 'https://lens.atoker.dev').replace(/\/$/, '');
}

// 1. Dynamic XML Sitemap
seoRouter.get('/sitemap.xml', (req: Request, res: Response) => {
  const siteUrl = getSiteUrl(req);
  const articles = db.prepare(`
    SELECT slug, date, updated_at
    FROM articles
    WHERE status = 'published'
    ORDER BY date DESC
  `).all() as Array<{ slug: string; date: string; updated_at: number }>;

  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Home / Archive
  xml += `  <url>\n`;
  xml += `    <loc>${siteUrl}/</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // Each published article
  for (const art of articles) {
    const lastMod = art.updated_at
      ? new Date(art.updated_at).toISOString().split('T')[0]
      : art.date || today;

    xml += `  <url>\n`;
    xml += `    <loc>${siteUrl}/article/${encodeURIComponent(art.slug)}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// 2. Robots.txt
seoRouter.get('/robots.txt', (req: Request, res: Response) => {
  const siteUrl = getSiteUrl(req);
  const txt = `# LENS // Robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /studio
Disallow: /yonetim
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(txt);
});
