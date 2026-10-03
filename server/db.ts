import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_ARTICLES } from '../src/data/mockArticles.ts';
import { Article } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'lens.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency & reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    dek TEXT DEFAULT '',
    abstract TEXT DEFAULT '',
    authors TEXT NOT NULL,
    date TEXT NOT NULL,
    displayDate TEXT DEFAULT '',
    readingTime TEXT DEFAULT '',
    version TEXT DEFAULT '',
    category TEXT NOT NULL,
    tags TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    doi TEXT DEFAULT '',
    keywords TEXT DEFAULT '[]',
    telemetry TEXT DEFAULT '{}',
    tables TEXT DEFAULT '[]',
    beforeAfterMedia TEXT DEFAULT '{}',
    series TEXT DEFAULT '{}',
    bibtex TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
  CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
  CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
  CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until INTEGER NOT NULL DEFAULT 0,
    last_attempt INTEGER NOT NULL
  );
`);

// Database row to Article mapper
export function rowToArticle(row: any): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.dek || '',
    abstract: row.abstract || '',
    authors: JSON.parse(row.authors || '[]'),
    date: row.date,
    displayDate: row.displayDate || '',
    readingTime: row.readingTime || '',
    version: row.version || '',
    category: row.category,
    tags: JSON.parse(row.tags || '[]'),
    status: row.status,
    doi: row.doi || '',
    keywords: JSON.parse(row.keywords || '[]'),
    telemetry: JSON.parse(row.telemetry || '{}'),
    tables: JSON.parse(row.tables || '[]'),
    beforeAfterMedia: row.beforeAfterMedia ? JSON.parse(row.beforeAfterMedia) : undefined,
    series: row.series && row.series !== '{}' ? JSON.parse(row.series) : undefined,
    bibtex: row.bibtex || '',
    content: row.content,
  };
}

// Upsert article query
const upsertArticleStmt = db.prepare(`
  INSERT INTO articles (
    id, slug, title, dek, abstract, authors, date, displayDate, readingTime,
    version, category, tags, status, doi, keywords, telemetry, tables,
    beforeAfterMedia, series, bibtex, content, created_at, updated_at
  ) VALUES (
    @id, @slug, @title, @dek, @abstract, @authors, @date, @displayDate, @readingTime,
    @version, @category, @tags, @status, @doi, @keywords, @telemetry, @tables,
    @beforeAfterMedia, @series, @bibtex, @content, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    title = excluded.title,
    dek = excluded.dek,
    abstract = excluded.abstract,
    authors = excluded.authors,
    date = excluded.date,
    displayDate = excluded.displayDate,
    readingTime = excluded.readingTime,
    version = excluded.version,
    category = excluded.category,
    tags = excluded.tags,
    status = excluded.status,
    doi = excluded.doi,
    keywords = excluded.keywords,
    telemetry = excluded.telemetry,
    tables = excluded.tables,
    beforeAfterMedia = excluded.beforeAfterMedia,
    series = excluded.series,
    bibtex = excluded.bibtex,
    content = excluded.content,
    updated_at = excluded.updated_at
`);

export function saveArticle(art: Article): Article {
  const now = Date.now();
  const existing = db.prepare('SELECT created_at FROM articles WHERE id = ?').get(art.id) as { created_at?: number } | undefined;
  const createdAt = existing?.created_at || now;

  upsertArticleStmt.run({
    id: art.id,
    slug: art.slug,
    title: art.title,
    dek: art.dek || '',
    abstract: art.abstract || '',
    authors: JSON.stringify(art.authors || []),
    date: art.date,
    displayDate: art.displayDate || '',
    readingTime: art.readingTime || '',
    version: art.version || '',
    category: art.category,
    tags: JSON.stringify(art.tags || []),
    status: art.status || 'published',
    doi: art.doi || '',
    keywords: JSON.stringify(art.keywords || []),
    telemetry: JSON.stringify(art.telemetry || {}),
    tables: JSON.stringify(art.tables || []),
    beforeAfterMedia: JSON.stringify(art.beforeAfterMedia || {}),
    series: JSON.stringify(art.series || {}),
    bibtex: art.bibtex || '',
    content: art.content || '',
    created_at: createdAt,
    updated_at: now,
  });

  return art;
}

// Auto-seed initial articles if database is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM articles');
const { count } = countStmt.get() as { count: number };

if (count === 0 && INITIAL_ARTICLES.length > 0) {
  console.log(`[LENS DB] Initializing database with ${INITIAL_ARTICLES.length} seed articles...`);
  const insertMany = db.transaction((articles: Article[]) => {
    for (const art of articles) {
      saveArticle(art);
    }
  });
  insertMany(INITIAL_ARTICLES);
  console.log('[LENS DB] Seed completed successfully.');
}
