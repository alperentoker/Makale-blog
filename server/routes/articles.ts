import { Router, Request, Response } from 'express';
import { db, rowToArticle, saveArticle } from '../db.ts';
import { requireAuth } from '../auth.ts';
import { Article } from '../../src/types/index.ts';
import { DEMO_SEED_ARTICLES } from '../../src/data/mockArticles.ts';

export const articlesRouter = Router();

// Helper to generate slug from title if not provided
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 1. GET /api/articles — List articles with draft protection & filters
articlesRouter.get('/', (req: Request, res: Response) => {
  const { category, q, status } = req.query;
  const isAdmin = !!req.authenticated;

  let query = 'SELECT * FROM articles WHERE 1=1';
  const params: any[] = [];

  // P1 Security: Public users ONLY see published articles!
  if (!isAdmin) {
    query += " AND status = 'published'";
  } else if (status && typeof status === 'string') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (category && typeof category === 'string' && category !== 'Tümü') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (q && typeof q === 'string' && q.trim()) {
    const searchPattern = `%${q.trim().toLowerCase()}%`;
    query += ' AND (LOWER(title) LIKE ? OR LOWER(dek) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(abstract) LIKE ?)';
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  const rows = db.prepare(query).all(...params);
  const articles = rows.map(rowToArticle);

  res.json(articles);
});

// 2. GET /api/articles/:idOrSlug — Single article with draft protection
articlesRouter.get('/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const isAdmin = !!req.authenticated;

  const row = db.prepare('SELECT * FROM articles WHERE id = ? OR LOWER(slug) = LOWER(?)').get(idOrSlug, idOrSlug);

  if (!row) {
    res.status(404).json({ error: 'Makale bulunamadı.' });
    return;
  }

  const article = rowToArticle(row);

  // If article is a draft and user is not an authenticated admin, return 404
  if (article.status !== 'published' && !isAdmin) {
    res.status(404).json({ error: 'Makale bulunamadı veya henüz yayınlanmadı.' });
    return;
  }

  res.json(article);
});

// 3. POST /api/articles — Create new article (Admin only)
articlesRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const body = req.body as Partial<Article>;

  if (!body.title || !body.category) {
    res.status(400).json({ error: 'Başlık ve kategori zorunludur.' });
    return;
  }

  const now = new Date();
  const id = body.id || `art-${Date.now()}`;
  let slug = body.slug ? slugify(body.slug) : slugify(body.title);

  // Ensure unique slug
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const existing = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(uniqueSlug, id);
    if (!existing) break;
    uniqueSlug = `${slug}-${counter++}`;
  }

  const article: Article = {
    id,
    slug: uniqueSlug,
    title: body.title,
    dek: body.dek || '',
    abstract: body.abstract || '',
    authors: body.authors && body.authors.length > 0 ? body.authors : [
      { name: 'Alperen Toker', affiliation: 'Yapay Zeka & Bilgisayarlı Görü', role: 'Yazar' }
    ],
    date: body.date || now.toISOString().split('T')[0],
    displayDate: body.displayDate || `${now.getDate()} ${now.toLocaleString('tr-TR', { month: 'long' })} ${now.getFullYear()}`,
    readingTime: body.readingTime || '5 dk okuma süresi',
    version: body.version || 'v1.0 - İlk Yayın',
    category: body.category,
    tags: body.tags || ['Genel'],
    status: body.status || 'draft',
    doi: body.doi || '',
    keywords: body.keywords || [],
    telemetry: body.telemetry || {},
    tables: body.tables || [],
    beforeAfterMedia: body.beforeAfterMedia,
    series: body.series,
    bibtex: body.bibtex || '',
    content: body.content || '',
  };

  saveArticle(article);
  res.status(201).json(article);
});

// 4. PUT /api/articles/:id — Update existing article (Admin only)
articlesRouter.put('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const existingRow = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);

  if (!existingRow) {
    res.status(404).json({ error: 'Güncellenecek makale bulunamadı.' });
    return;
  }

  const existing = rowToArticle(existingRow);
  const body = req.body as Partial<Article>;

  let slug = body.slug ? slugify(body.slug) : existing.slug;
  // Verify slug uniqueness against other articles
  const conflict = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, id);
  if (conflict) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const updatedArticle: Article = {
    ...existing,
    ...body,
    id, // Preserve original ID
    slug,
  };

  saveArticle(updatedArticle);
  res.json(updatedArticle);
});

// 5. DELETE /api/articles/:id — Delete article (Admin only)
articlesRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const info = db.prepare('DELETE FROM articles WHERE id = ?').run(id);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Silinecek makale bulunamadı.' });
    return;
  }

  res.json({ success: true, message: 'Makale başarıyla silindi.' });
});

// 6. POST /api/articles/import — Batch import articles (Admin only)
articlesRouter.post('/import', requireAuth, (req: Request, res: Response) => {
  const { articles } = req.body as { articles: Article[] };

  if (!Array.isArray(articles) || articles.length === 0) {
    res.status(400).json({ error: 'İçe aktarılacak geçerli makale listesi bulunamadı.' });
    return;
  }

  const insertTx = db.transaction((arts: Article[]) => {
    for (const art of arts) {
      if (!art.id) art.id = `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      if (!art.slug) art.slug = slugify(art.title);
      saveArticle(art);
    }
  });

  insertTx(articles);
  res.json({ success: true, count: articles.length, message: `${articles.length} makale başarıyla içe aktarıldı.` });
});

// 7. POST /api/articles/seed — Seed default demo articles (Admin only)
articlesRouter.post('/seed', requireAuth, (_req: Request, res: Response) => {
  const seedTx = db.transaction((arts: Article[]) => {
    for (const art of arts) {
      saveArticle(art);
    }
  });

  seedTx(DEMO_SEED_ARTICLES);
  res.json({ success: true, count: DEMO_SEED_ARTICLES.length, message: 'Örnek makaleler başarıyla yüklendi.' });
});

// 8. POST /api/articles/wipe — Wipe all articles (Admin only)
articlesRouter.post('/wipe', requireAuth, (_req: Request, res: Response) => {
  db.prepare('DELETE FROM articles').run();
  res.json({ success: true, message: 'Tüm makaleler veritabanından silindi.' });
});
