// Rename an article's slug and keep the old URL working (301 redirect).
//
//   npx tsx server/scripts/rename-slug.ts <current-slug> [new-slug]
//
// Without [new-slug], the slug is regenerated from the title with the
// Turkish-aware slugify. A backup of the database is written first.
import 'dotenv/config';
import path from 'path';
import { db, recordSlugChange } from '../db.ts';
import { slugify } from '../routes/articles.ts';
import { invalidateArticleCard } from '../routes/seo.ts';

const [currentSlug, requestedSlug] = process.argv.slice(2);
if (!currentSlug) {
  console.error('Kullanım: npx tsx server/scripts/rename-slug.ts <mevcut-slug> [yeni-slug]');
  process.exit(1);
}

const row = db.prepare('SELECT id, slug, title FROM articles WHERE slug = ?').get(currentSlug) as
  | { id: string; slug: string; title: string }
  | undefined;
if (!row) {
  console.error(`Makale bulunamadı: ${currentSlug}`);
  process.exit(1);
}

const newSlug = slugify(requestedSlug || row.title);
if (newSlug === row.slug) {
  console.log('Slug zaten güncel, değişiklik yapılmadı.');
  process.exit(0);
}
if (db.prepare('SELECT 1 FROM articles WHERE slug = ? AND id != ?').get(newSlug, row.id)) {
  console.error(`Bu slug başka bir makalede kullanılıyor: ${newSlug}`);
  process.exit(1);
}

const backupPath = path.join(path.dirname(db.name), `lens.db.bak-${Date.now()}`);
await db.backup(backupPath);
console.log(`Yedek: ${backupPath}`);

db.transaction(() => {
  db.prepare('UPDATE articles SET slug = ?, updated_at = ? WHERE id = ?').run(newSlug, Date.now(), row.id);
  recordSlugChange(row.id, row.slug, newSlug);
})();
invalidateArticleCard(row.slug);

console.log(`${row.slug}\n  -> ${newSlug}\nEski adres 301 ile yeni adrese yönlendirilecek.`);
