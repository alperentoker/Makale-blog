import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { db, rowToArticle, findArticleIdBySlugRedirect } from '../db.ts';
import { escapeHtml, markdownToSeoHtml } from '../lib/seoRender.ts';
import { Article } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

export const seoRouter = Router();

// Resolve the canonical site URL. The configured SITE_URL wins so that
// client-controlled Host / X-Forwarded-Host headers can never rewrite
// canonical, sitemap or OG URLs; the request host is only a dev fallback.
function getSiteUrl(req: Request): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host') || '127.0.0.1:3001'}`;
}

// Clean string for description meta tags (strip markdown syntax, newlines, etc.)
function cleanDescription(text: string = '', maxLength: number = 200): string {
  const plain = text
    .replace(/!\[.*?\]\(.*?\)/g, '') // remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // unwrap links
    .replace(/[#*`_~>[\]]/g, '') // remove markdown symbols
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength - 1) + '…';
}

// Resolve an article for public, unauthenticated pages. Drafts and articles
// under review are never returned, including through the legacy alias.
export function findPublishedArticle(idOrSlug: string): Article | null {
  let row = db.prepare("SELECT * FROM articles WHERE (slug = ? OR id = ?) AND status = 'published'").get(idOrSlug, idOrSlug);
  if (!row && (idOrSlug.includes('eo-ir') || idOrSlug.includes('dualmode') || idOrSlug.includes('roadmap') || idOrSlug.includes('benchmark'))) {
    row = db.prepare("SELECT * FROM articles WHERE id = 'art-benchmark-roadmap' AND status = 'published'").get();
  }
  return row ? rowToArticle(row) : null;
}

const ogDir = path.join(projectRoot, 'public', 'og');

function articleCardPath(slug: string): string | null {
  const outPath = path.join(ogDir, `${slug}.png`);
  // Guard against slugs that could escape the og cache directory.
  if (path.dirname(outPath) !== ogDir) return null;
  return outPath;
}

// Remove a cached OG card so the next request renders it from fresh metadata
// (called when an article's title/metadata changes or it is deleted).
export function invalidateArticleCard(slug: string): void {
  const outPath = slug ? articleCardPath(slug) : null;
  if (outPath) fs.rmSync(outPath, { force: true });
}

// In-flight generations keyed by output path, so concurrent first requests
// share a single python3 process instead of spawning one each.
const pendingCards = new Map<string, Promise<string>>();

// Asynchronously generates an article OG image card if not already created
export function generateArticleCardAsync(art: Article): Promise<string> {
  const outPath = articleCardPath(art.slug);
  if (!outPath) return Promise.reject(new Error('Invalid article slug for OG card'));
  if (fs.existsSync(outPath)) return Promise.resolve(outPath);

  const pending = pendingCards.get(outPath);
  if (pending) return pending;

  const job = new Promise<string>((resolve, reject) => {
    if (!fs.existsSync(ogDir)) {
      fs.mkdirSync(ogDir, { recursive: true });
    }

    const scriptPath = path.join(projectRoot, 'server', 'og-generator.py');
    const authorName = art.authors && art.authors.length > 0 ? art.authors[0].name : 'Alperen Toker';
    const dateStr = art.displayDate || art.date;

    const child = spawn('python3', [
      scriptPath,
      '--title', art.title,
      '--category', art.category || 'Kenar Yapay Zeka',
      '--date', dateStr,
      '--reading-time', art.readingTime || '',
      '--author', authorName,
      '--output', outPath
    ]);

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outPath)) {
        resolve(outPath);
      } else {
        reject(new Error(`OG generator exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  }).finally(() => pendingCards.delete(outPath));

  pendingCards.set(outPath, job);
  return job;
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
  // Do not disclose internal admin paths here; robots.txt is public and would
  // otherwise hand attackers a map of the admin surface. Those routes are
  // protected server-side anyway.
  const txt = `# LENS // Robots.txt
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(txt);
});

// 2.1 RSS 2.0 Feed (fast, crawler- and reader-friendly distribution)
seoRouter.get('/feed.xml', (req: Request, res: Response) => {
  const siteUrl = getSiteUrl(req);
  const articles = db.prepare(`
    SELECT slug, title, dek, abstract, date, updated_at
    FROM articles
    WHERE status = 'published'
    ORDER BY date DESC
    LIMIT 50
  `).all() as Array<{ slug: string; title: string; dek: string; abstract: string; date: string; updated_at: number }>;

  const latest = articles.reduce((max, a) => Math.max(max, a.updated_at || 0), Date.now());

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';
  xml += '    <title>LENS // Alperen Toker</title>\n';
  xml += `    <link>${siteUrl}/</link>\n`;
  xml += '    <description>Alperen Toker — bilgisayarlı görü, derin öğrenme ve savunma teknolojileri üzerine araştırma ve mühendislik günlüğü.</description>\n';
  xml += '    <language>tr</language>\n';
  xml += `    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>\n`;
  xml += `    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;

  for (const art of articles) {
    const url = `${siteUrl}/article/${encodeURIComponent(art.slug)}`;
    const summary = cleanDescription(art.abstract || art.dek || '', 300);
    const pubDate = art.date ? new Date(`${art.date}T00:00:00Z`).toUTCString() : new Date(art.updated_at || Date.now()).toUTCString();
    xml += '    <item>\n';
    xml += `      <title>${escapeHtml(art.title)}</title>\n`;
    xml += `      <link>${url}</link>\n`;
    xml += `      <guid isPermaLink="true">${url}</guid>\n`;
    xml += `      <pubDate>${pubDate}</pubDate>\n`;
    xml += `      <description>${escapeHtml(summary)}</description>\n`;
    xml += '    </item>\n';
  }

  xml += '  </channel>\n</rss>';

  res.header('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(xml);
});

// 3. Static Site OG Image fallback
seoRouter.get('/og-image.png', (_req: Request, res: Response) => {
  const siteOg = path.join(projectRoot, 'public', 'og-image.png');
  if (fs.existsSync(siteOg)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.sendFile(siteOg, { dotfiles: 'allow' });
    return;
  }
  res.status(404).end();
});

// 4. Dynamic Article OG Image Endpoint (/og/:slug.png)
seoRouter.get('/og/:slug.png', async (req: Request, res: Response) => {
  const slug = String(req.params.slug);

  // Reject slugs that could escape the og cache directory (path traversal).
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug)) {
    res.status(400).end();
    return;
  }

  // Always resolve through the published-article lookup: a cached card for a
  // draft (or one left behind by a renamed article) must never be served.
  const article = findPublishedArticle(slug);
  if (article) {
    try {
      const generatedPath = await generateArticleCardAsync(article);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(generatedPath, { dotfiles: 'allow' });
      return;
    } catch (e) {
      console.warn('[LENS OG] On-demand card generation warning:', e);
    }
  }

  // Fallback to site default og-image
  const defaultOg = path.join(projectRoot, 'public', 'og-image.png');
  if (fs.existsSync(defaultOg)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(defaultOg, { dotfiles: 'allow' });
  } else {
    res.status(404).end();
  }
});

// 5. Dynamic HTML Meta Injection for Articles (/article/:idOrSlug & /makale/:idOrSlug)
function handleArticlePage(req: Request, res: Response) {
  const idOrSlug = String(req.params.idOrSlug);
  const siteUrl = getSiteUrl(req);

  // Read HTML template (dist/index.html in production, fallback to index.html in dev)
  const distHtmlPath = path.join(projectRoot, 'dist', 'index.html');
  const srcHtmlPath = path.join(projectRoot, 'index.html');
  const templatePath = fs.existsSync(distHtmlPath) ? distHtmlPath : srcHtmlPath;

  if (!fs.existsSync(templatePath)) {
    res.status(500).send('Index template not found.');
    return;
  }

  let html = fs.readFileSync(templatePath, 'utf8');

  // Query published article (with backward-compatible alias fallback for former
  // eo-ir roadmap URLs). Drafts get the bare SPA shell: no title, abstract or
  // body leaks into the server-rendered HTML. An authenticated admin still sees
  // the draft because the SPA fetches it from the API with their session.
  const article = findPublishedArticle(idOrSlug);
  if (!article) {
    // Old link to a renamed article: permanently redirect to its current URL.
    const redirectedId = findArticleIdBySlugRedirect(idOrSlug);
    const target = redirectedId ? findPublishedArticle(redirectedId) : null;
    if (target) {
      res.redirect(301, `/article/${encodeURIComponent(target.slug)}`);
      return;
    }
    res.status(404).type('html').send(html);
    return;
  }

  const title = `${article.title} // LENS`;
  const rawDesc = article.abstract || article.dek || 'LENS Araştırma & Mühendislik Raporu';
  const desc = cleanDescription(rawDesc, 190);
  const articleUrl = `${siteUrl}/article/${encodeURIComponent(article.slug)}`;
  const ogImageUrl = `${siteUrl}/og/${encodeURIComponent(article.slug)}.png`;
  const authorName = article.authors && article.authors.length > 0 ? article.authors[0].name : 'Alperen Toker';
  const tags = article.tags || [];

  // Generate article OG image in background if missing
  generateArticleCardAsync(article).catch(() => {});

  // Replace Title & Description
  html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta\s+name="title"\s+content=".*?"\s*\/?>/i, () => `<meta name="title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, () => `<meta name="description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, () => `<link rel="canonical" href="${escapeHtml(articleUrl)}" />`);

  // Replace Open Graph Tags
  html = html.replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:type" content="article" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:url" content="${escapeHtml(articleUrl)}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`);
  html = html.replace(/<meta\s+property="og:image:secure_url"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />`);
  html = html.replace(/<meta\s+property="og:image:alt"\s+content=".*?"\s*\/?>/i, () => `<meta property="og:image:alt" content="${escapeHtml(article.title)}" />`);

  // Replace Twitter Tags
  html = html.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/i, () => `<meta name="twitter:url" content="${escapeHtml(articleUrl)}" />`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, () => `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, () => `<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i, () => `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`);
  html = html.replace(/<meta\s+name="twitter:image:alt"\s+content=".*?"\s*\/?>/i, () => `<meta name="twitter:image:alt" content="${escapeHtml(article.title)}" />`);

  // Article body rendered server-side into a <noscript> fallback so crawlers
  // that do not execute JavaScript still receive the full article text.
  const seoIntro = [
    article.dek ? `<p><strong>${escapeHtml(article.dek)}</strong></p>` : '',
    article.abstract ? `<p>${escapeHtml(article.abstract)}</p>` : '',
  ].join('');
  const seoBody = markdownToSeoHtml(article.content || '');
  const noscriptHtml = `<noscript id="lens-seo-content"><article>`
    + `<h1>${escapeHtml(article.title)}</h1>`
    + seoIntro
    + seoBody
    + `</article></noscript>`;

  // Inject Article Open Graph Specifics and JSON-LD before </head>
  const articleMetaAdditions = `
    <!-- Article Specific OpenGraph Metadata -->
    <meta property="article:published_time" content="${escapeHtml(article.date)}" />
    <meta property="article:author" content="${escapeHtml(authorName)}" />
    <meta property="article:section" content="${escapeHtml(article.category)}" />
    ${tags.map(t => `<meta property="article:tag" content="${escapeHtml(t)}" />`).join('\n    ')}

    <!-- TechArticle JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": ${JSON.stringify(article.title)},
      "description": ${JSON.stringify(desc)},
      "image": [${JSON.stringify(ogImageUrl)}],
      "datePublished": ${JSON.stringify(article.date)},
      "author": [{
        "@type": "Person",
        "name": ${JSON.stringify(authorName)},
        "url": ${JSON.stringify(siteUrl)}
      }],
      "publisher": {
        "@type": "Organization",
        "name": "LENS",
        "url": ${JSON.stringify(siteUrl)},
        "logo": {
          "@type": "ImageObject",
          "url": ${JSON.stringify(siteUrl + '/favicon.svg')}
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": ${JSON.stringify(articleUrl)}
      }
    }
    </script>

    <!-- Breadcrumb JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "LENS", "item": ${JSON.stringify(siteUrl + '/')} },
        { "@type": "ListItem", "position": 2, "name": ${JSON.stringify(article.title)}, "item": ${JSON.stringify(articleUrl)} }
      ]
    }
    </script>
  </head>`;

  html = html.replace('</head>', () => articleMetaAdditions);

  // Place the crawler-visible article content directly in the document body.
  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', () => `<div id="root"></div>\n${noscriptHtml}`);
  } else {
    html = html.replace('</body>', () => `${noscriptHtml}\n</body>`);
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  res.type('html').send(html);
}

seoRouter.get('/article/:idOrSlug', handleArticlePage);
seoRouter.get('/makale/:idOrSlug', handleArticlePage);

// 6. Homepage SEO shell: the SPA root HTML has an empty #root, so inject a
// crawler-visible index of published articles plus ItemList structured data.
function handleHomePage(req: Request, res: Response): void {
  const siteUrl = getSiteUrl(req);
  const distHtmlPath = path.join(projectRoot, 'dist', 'index.html');
  const srcHtmlPath = path.join(projectRoot, 'index.html');
  const templatePath = fs.existsSync(distHtmlPath) ? distHtmlPath : srcHtmlPath;

  if (!fs.existsSync(templatePath)) {
    res.status(500).send('Index template not found.');
    return;
  }

  let html = fs.readFileSync(templatePath, 'utf8');

  const articles = db.prepare(`
    SELECT slug, title, dek, abstract, date
    FROM articles
    WHERE status = 'published'
    ORDER BY date DESC
  `).all() as Array<{ slug: string; title: string; dek: string; abstract: string; date: string }>;

  const items = articles.map(a => {
    const url = `${siteUrl}/article/${encodeURIComponent(a.slug)}`;
    const summary = cleanDescription(a.abstract || a.dek || '', 240);
    return `<li><a href="${url}">${escapeHtml(a.title)}</a>${summary ? ` — ${escapeHtml(summary)}` : ''}</li>`;
  }).join('\n        ');

  const noscriptHtml = `<noscript id="lens-seo-content"><main>`
    + `<h1>LENS // Alperen Toker — Araştırma ve Mühendislik Notları</h1>`
    + `<p>Alperen Toker'in bilgisayarlı görü, derin öğrenme ve savunma teknolojileri üzerine araştırma ve mühendislik günlüğü.</p>`
    + (items ? `<ul>\n        ${items}\n      </ul>` : '')
    + `</main></noscript>`;

  const itemListLd = articles.length ? `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": [
        ${articles.map((a, idx) => `{ "@type": "ListItem", "position": ${idx + 1}, "url": ${JSON.stringify(`${siteUrl}/article/${encodeURIComponent(a.slug)}`)}, "name": ${JSON.stringify(a.title)} }`).join(',\n        ')}
      ]
    }
    </script>
  </head>` : '';

  if (itemListLd) {
    html = html.replace('</head>', () => itemListLd);
  }

  // Advertise the RSS feed to crawlers and feed readers.
  html = html.replace('</head>', () => `    <link rel="alternate" type="application/rss+xml" title="LENS RSS" href="/feed.xml" />\n  </head>`);

  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', () => `<div id="root"></div>\n${noscriptHtml}`);
  } else {
    html = html.replace('</body>', () => `${noscriptHtml}\n</body>`);
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  res.type('html').send(html);
}

seoRouter.get('/', handleHomePage);
