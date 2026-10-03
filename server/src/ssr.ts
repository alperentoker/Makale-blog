import type { Article } from '../../src/types/index.ts';
import type { AppConfig } from './config.ts';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function injectArticleMeta(html: string, article: Article, config: AppConfig): string {
  const url = `${config.publicOrigin}/article/${encodeURIComponent(article.slug)}`;
  const title = escapeHtml(`${article.title} // LENS`);
  const description = escapeHtml((article.dek || article.abstract || '').slice(0, 220));
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');

  let next = html.replace(/<title>[\s\S]*?<\/title>/i, tags);
  if (!next.includes('property="og:title"')) {
    next = next.replace('</head>', `    ${tags}\n  </head>`);
  }
  return next;
}

export function sitemapXml(articles: Article[], config: AppConfig): string {
  const urls = [
    `  <url><loc>${config.publicOrigin}/</loc><changefreq>weekly</changefreq></url>`,
    ...articles
      .filter(a => a.status === 'published')
      .map(
        a =>
          `  <url><loc>${config.publicOrigin}/article/${encodeURIComponent(a.slug)}</loc><changefreq>monthly</changefreq></url>`,
      ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(config: AppConfig): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /studio\nDisallow: /yonetim\nDisallow: /api/admin\nSitemap: ${config.publicOrigin}/sitemap.xml\n`;
}
