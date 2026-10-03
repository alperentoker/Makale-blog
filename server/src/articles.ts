import type Database from 'better-sqlite3';
import type { Article } from '../../src/types/index.ts';

const MAX_CONTENT_CHARS = 800_000;

export function rowToArticle(payload: string): Article {
  return JSON.parse(payload) as Article;
}

export function listArticles(db: Database.Database, opts?: { publishedOnly?: boolean }): Article[] {
  const rows = opts?.publishedOnly
    ? db.prepare(`SELECT payload FROM articles WHERE status = 'published' ORDER BY json_extract(payload, '$.date') DESC`).all()
    : db.prepare(`SELECT payload FROM articles ORDER BY json_extract(payload, '$.date') DESC`).all();
  return (rows as Array<{ payload: string }>).map(r => rowToArticle(r.payload));
}

export function getArticle(db: Database.Database, idOrSlug: string): Article | null {
  const row = db
    .prepare(
      `SELECT payload FROM articles WHERE id = ? OR lower(slug) = lower(?) LIMIT 1`,
    )
    .get(idOrSlug, idOrSlug) as { payload: string } | undefined;
  return row ? rowToArticle(row.payload) : null;
}

export function upsertArticle(db: Database.Database, article: Article): Article {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO articles (id, slug, payload, status, updated_at)
     VALUES (@id, @slug, @payload, @status, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       slug = excluded.slug,
       payload = excluded.payload,
       status = excluded.status,
       updated_at = excluded.updated_at`,
  ).run({
    id: article.id,
    slug: article.slug,
    payload: JSON.stringify(article),
    status: article.status,
    updated_at: now,
  });
  return article;
}

export function deleteArticle(db: Database.Database, id: string): boolean {
  const info = db.prepare(`DELETE FROM articles WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function replaceAllArticles(db: Database.Database, articles: Article[]): void {
  const tx = db.transaction((items: Article[]) => {
    db.prepare(`DELETE FROM articles`).run();
    for (const article of items) upsertArticle(db, article);
  });
  tx(articles);
}

export function wipeArticles(db: Database.Database): void {
  db.prepare(`DELETE FROM articles`).run();
}

export function validateArticle(input: unknown): { ok: true; article: Article } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Geçersiz makale gövdesi.' };
  }
  const a = input as Partial<Article>;
  if (!a.id || typeof a.id !== 'string' || a.id.length > 120) {
    return { ok: false, message: 'Geçersiz makale kimliği.' };
  }
  if (!a.slug || typeof a.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(a.slug) || a.slug.length > 180) {
    return { ok: false, message: 'Slug yalnızca harf, rakam ve tire içermelidir.' };
  }
  if (!a.title || typeof a.title !== 'string' || a.title.length > 400) {
    return { ok: false, message: 'Başlık zorunludur.' };
  }
  if (typeof a.content !== 'string' || a.content.length > MAX_CONTENT_CHARS) {
    return { ok: false, message: 'İçerik çok büyük veya geçersiz.' };
  }
  const status = a.status === 'draft' || a.status === 'under_review' || a.status === 'published'
    ? a.status
    : 'draft';

  const article: Article = {
    id: a.id,
    slug: a.slug.toLowerCase(),
    title: a.title,
    dek: String(a.dek ?? ''),
    abstract: String(a.abstract ?? ''),
    authors: Array.isArray(a.authors) ? a.authors : [],
    date: String(a.date ?? new Date().toISOString().slice(0, 10)),
    displayDate: String(a.displayDate ?? ''),
    readingTime: String(a.readingTime ?? ''),
    version: String(a.version ?? ''),
    category: (a.category as Article['category']) || 'Kenar Yapay Zeka',
    tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
    status,
    content: a.content,
    bibtex: String(a.bibtex ?? ''),
    doi: a.doi ? String(a.doi) : undefined,
    keywords: a.keywords,
    series: a.series,
    beforeAfterMedia: a.beforeAfterMedia,
    tables: a.tables,
    telemetry: a.telemetry,
  };
  return { ok: true, article };
}
