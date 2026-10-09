import { Router, Request, Response } from 'express';
import { db, rowToArticle, saveArticle } from '../db.ts';
import { requireAuth } from '../auth.ts';
import { Article } from '../../src/types/index.ts';

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

// Helper to sanitize raw search terms into safe SQLite FTS5 query tokens
function sanitizeFtsQuery(raw: string): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}\s_-]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';
  return words.map(w => `"${w}"*`).join(' AND ');
}

// 1. GET /api/articles — List articles with draft protection, FTS5 search, & light payload projection
articlesRouter.get('/', (req: Request, res: Response) => {
  const { category, q, status, includeContent: incContentParam } = req.query;
  const isAdmin = !!req.authenticated;
  const includeContent = incContentParam === 'true';

  const selectFields = `
    a.id, a.slug, a.title, a.dek, a.abstract, a.authors, a.date, a.displayDate,
    a.readingTime, a.version, a.category, a.tags, a.status, a.doi, a.keywords,
    a.telemetry, a.tables, a.beforeAfterMedia, a.series, a.bibtex,
    ${includeContent ? 'a.content,' : "'' as content,"}
    a.created_at, a.updated_at
  `;

  // 1.1 High-speed SQLite FTS5 Full-Text Search if query is present
  const ftsQuery = q && typeof q === 'string' ? sanitizeFtsQuery(q) : '';
  if (ftsQuery) {
    try {
      let query = `
        SELECT ${selectFields},
               bm25(articles_fts, 5.0, 3.0, 2.0, 2.0, 1.0) AS rank,
               snippet(articles_fts, -1, '<mark class="lens-search-hit">', '</mark>', '...', 28) AS searchSnippet
        FROM articles a
        JOIN articles_fts ON articles_fts.id = a.id
        WHERE articles_fts MATCH ?
      `;
      const params: any[] = [ftsQuery];

      if (!isAdmin) {
        query += " AND a.status = 'published'";
      } else if (status && typeof status === 'string') {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (category && typeof category === 'string' && category !== 'Tümü') {
        query += ' AND a.category = ?';
        params.push(category);
      }

      query += ' ORDER BY rank ASC, a.date DESC';

      const rows = db.prepare(query).all(...params);
      if (rows.length > 0) {
        res.json(rows.map(rowToArticle));
        return;
      }
    } catch (err) {
      console.warn('[LENS DB] FTS search fallback to LIKE:', err);
    }
  }

  // 1.2 Standard list query (fallback or when no search query is specified)
  let query = `SELECT ${selectFields} FROM articles a WHERE 1=1`;
  const params: any[] = [];

  // P1 Security: Public users ONLY see published articles!
  if (!isAdmin) {
    query += " AND a.status = 'published'";
  } else if (status && typeof status === 'string') {
    query += ' AND a.status = ?';
    params.push(status);
  }

  if (category && typeof category === 'string' && category !== 'Tümü') {
    query += ' AND a.category = ?';
    params.push(category);
  }

  if (q && typeof q === 'string' && q.trim()) {
    const searchPattern = `%${q.trim().toLowerCase()}%`;
    query += ' AND (LOWER(a.title) LIKE ? OR LOWER(a.dek) LIKE ? OR LOWER(a.tags) LIKE ? OR LOWER(a.abstract) LIKE ?)';
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY a.date DESC, a.created_at DESC';

  const rows = db.prepare(query).all(...params);
  const articles = rows.map(rowToArticle);

  res.json(articles);
});

// 2. GET /api/articles/:idOrSlug — Single article with draft protection
articlesRouter.get('/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const isAdmin = !!req.authenticated;

  let row = db.prepare('SELECT * FROM articles WHERE id = ? OR LOWER(slug) = LOWER(?)').get(idOrSlug, idOrSlug);

  // Backward compatibility alias: former 'eo-ir' roadmap slug/id maps to current roadmap article
  if (!row && (idOrSlug.includes('eo-ir') || idOrSlug.includes('dualmode') || idOrSlug.includes('roadmap') || idOrSlug.includes('benchmark'))) {
    row = db.prepare("SELECT * FROM articles WHERE id = 'art-benchmark-roadmap'").get();
  }

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

// 7. POST /api/articles/seed — Seed default demo articles (Disabled in live CMS)
articlesRouter.post('/seed', requireAuth, (_req: Request, res: Response) => {
  res.json({ success: true, count: 0, message: 'Canlı CMS modunda örnek makale yüklemesi devre dışıdır.' });
});

// 8. POST /api/articles/wipe — Wipe all articles (Admin only)
articlesRouter.post('/wipe', requireAuth, (_req: Request, res: Response) => {
  db.prepare('DELETE FROM articles').run();
  res.json({ success: true, message: 'Tüm makaleler veritabanından silindi.' });
});

// 9. POST /api/articles/resolve-academic — Automatic paper ingestion via DOI or arXiv ID (Admin only)
articlesRouter.post('/resolve-academic', requireAuth, async (req: Request, res: Response) => {
  const { identifier } = req.body as { identifier?: string };

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    res.status(400).json({ error: 'Geçerli bir DOI veya arXiv kimliği (identifier) belirtilmelidir.' });
    return;
  }

  const raw = identifier.trim();

  // 9.1 Detect arXiv ID (e.g. 2304.05310, arxiv:2304.05310, https://arxiv.org/abs/2304.05310)
  const arxivMatch = raw.match(/(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i);
  if (arxivMatch && (raw.includes('arxiv') || /^\d{4}\.\d{4,5}/.test(raw))) {
    const arxivId = arxivMatch[1];
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'LENS-CMS/1.0 (academic-resolver)' },
        signal: AbortSignal.timeout(15000),
      });

      if (!apiRes.ok) {
        res.status(502).json({ error: `arXiv API yanıt vermedi: HTTP ${apiRes.status}` });
        return;
      }

      const xmlText = await apiRes.text();
      if (!xmlText.includes('<entry>') || xmlText.includes('Error')) {
        res.status(404).json({ error: `arXiv makalesi bulunamadı (${arxivId}).` });
        return;
      }

      // Extract title
      const titleMatch = xmlText.match(/<title>([\s\S]*?)<\/title>/g);
      const rawTitle = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<\/?title>/g, '').replace(/\s+/g, ' ').trim() : 'arXiv Makalesi';

      // Extract summary / abstract
      const summaryMatch = xmlText.match(/<summary>([\s\S]*?)<\/summary>/);
      const rawAbstract = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';

      // Extract published date
      const dateMatch = xmlText.match(/<published>([\s\S]*?)<\/published>/);
      const isoDate = dateMatch ? dateMatch[1].split('T')[0] : new Date().toISOString().split('T')[0];
      const pubYear = isoDate.split('-')[0];

      // Extract authors
      const authors: Array<{ name: string; affiliation: string; role?: string }> = [];
      const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
      let aMatch: RegExpExecArray | null;
      while ((aMatch = authorRegex.exec(xmlText)) !== null) {
        const name = aMatch[1].trim();
        if (name) {
          authors.push({ name, affiliation: 'Araştırmacı', role: 'Yazar' });
        }
      }

      // Extract DOI if available
      const doiMatch = xmlText.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);
      const doi = doiMatch ? doiMatch[1].trim() : `10.48550/arXiv.${arxivId}`;

      // Generate clean BibTeX
      const bibKey = `arxiv_${arxivId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const bibtex = `@article{${bibKey},
  title={${rawTitle}},
  author={${authors.map(a => a.name).join(' and ') || 'Anonim'}},
  journal={arXiv preprint arXiv:${arxivId}},
  year={${pubYear}},
  url={https://arxiv.org/abs/${arxivId}}
}`;

      const generatedContent = `# ${rawTitle}

## (${rawTitle.slice(0, 80)}...)

${rawAbstract}

### 1. Giriş ve Arka Plan

Bu çalışma, **arXiv:${arxivId}** önbaskısı üzerinden LENS sistemine otomatik olarak aktarılmıştır.

> [!NOTE]
> Bu makale arXiv üzerinden otomatik çekilmiştir. Tam analiz bulgularını ve deneysel parametreleri aşağıda düzenleyebilirsiniz.

### 2. Metodoloji ve Bulgular

- **Birincil Model Mimarisi:** Belirtilmedi
- **Kaynak DOI:** ${doi}
`;

      res.json({
        success: true,
        source: 'arxiv',
        metadata: {
          title: rawTitle,
          dek: `${rawTitle.slice(0, 90)}...`,
          abstract: rawAbstract,
          authors: authors.length > 0 ? authors : [{ name: 'Alperen Toker', affiliation: 'LENS' }],
          date: isoDate,
          doi,
          bibtex,
          category: 'Kenar Yapay Zeka',
          tags: ['arXiv', 'Yapay Zeka', 'Akademik'],
          content: generatedContent,
        },
      });
      return;
    } catch (err: any) {
      res.status(500).json({ error: `arXiv metadata çekilemedi: ${err.message}` });
      return;
    }
  }

  // 9.2 Detect DOI (e.g. 10.1109/TPAMI.2023.1234567 or doi.org/...)
  const cleanDoi = raw
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();

  if (/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(cleanDoi)) {
    try {
      const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
      const crossRes = await fetch(crossrefUrl, {
        headers: {
          'User-Agent': 'LENS-CMS/1.0 (mailto:admin@lens-research.local)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!crossRes.ok) {
        res.status(404).json({ error: `Crossref DOI kaydı bulunamadı (HTTP ${crossRes.status}).` });
        return;
      }

      const crossData = (await crossRes.json()) as any;
      const work = crossData.message;

      const rawTitle = work.title && work.title[0] ? work.title[0].replace(/\s+/g, ' ').trim() : 'Akademik Yayın';
      let rawAbstract = '';
      if (work.abstract) {
        rawAbstract = work.abstract.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      }

      const dateParts = work.published?.['date-parts']?.[0] || work['published-print']?.['date-parts']?.[0] || [new Date().getFullYear(), 1, 1];
      const pubYear = dateParts[0] || new Date().getFullYear();
      const pubMonth = String(dateParts[1] || 1).padStart(2, '0');
      const pubDay = String(dateParts[2] || 1).padStart(2, '0');
      const isoDate = `${pubYear}-${pubMonth}-${pubDay}`;

      const authors: Array<{ name: string; affiliation: string; role?: string }> = [];
      if (Array.isArray(work.author)) {
        for (const a of work.author) {
          const fullName = [a.given, a.family].filter(Boolean).join(' ') || a.name || 'Araştırmacı';
          const aff = a.affiliation?.[0]?.name || 'Akademik Kurum';
          authors.push({ name: fullName, affiliation: aff, role: 'Yazar' });
        }
      }

      const journal = work['container-title']?.[0] || 'IEEE / Uluslararası Hakemli Dergi';
      const bibKey = `doi_${cleanDoi.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const bibtex = `@article{${bibKey},
  title={${rawTitle}},
  author={${authors.map(a => a.name).join(' and ') || 'Anonim'}},
  journal={${journal}},
  year={${pubYear}},
  doi={${cleanDoi}}
}`;

      const generatedContent = `# ${rawTitle}

## (${journal} // ${pubYear})

${rawAbstract || 'Özet metni Crossref kaydında bulunamadı.'}

### 1. Çalışma Özeti ve Referans

Bu makale **${cleanDoi}** DOI numarası ile ${journal} bünyesinde taranmıştır.

> [!INSIGHT]
> DOI kaydı Crossref üzerinden çekilmiştir.

### 2. Metodoloji ve Teknik Bulgular

- **Yayın Organı:** ${journal}
- **Yayın Yılı:** ${pubYear}
- **DOI Bağlantısı:** https://doi.org/${cleanDoi}
`;

      res.json({
        success: true,
        source: 'crossref',
        metadata: {
          title: rawTitle,
          dek: `${journal} // ${pubYear}`,
          abstract: rawAbstract,
          authors: authors.length > 0 ? authors : [{ name: 'Alperen Toker', affiliation: 'LENS' }],
          date: isoDate,
          doi: cleanDoi,
          bibtex,
          category: 'Veri Mühendisliği',
          tags: ['DOI', 'Peer-Reviewed', 'Akademik'],
          content: generatedContent,
        },
      });
      return;
    } catch (err: any) {
      res.status(500).json({ error: `DOI kaydı çözülemedi: ${err.message}` });
      return;
    }
  }

  res.status(400).json({
    error: 'Geçersiz format. Lütfen geçerli bir arXiv ID (örn: 2304.05310) veya DOI (örn: 10.1109/TPAMI.2023.1234567) girin.',
  });
});
