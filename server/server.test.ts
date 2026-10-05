import test from 'node:test';
import assert from 'node:assert/strict';
import { db, saveArticle, rowToArticle } from './db.ts';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  createSession,
  destroySession,
  destroyAllSessions,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from './auth.ts';
import { Article } from '../src/types/index.ts';

test('1. Database: Seeding and Table Verification', () => {
  const row = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
  assert.ok(row.count >= 1, 'Database should contain at least 1 seeded article');

  const articleRow = db.prepare('SELECT * FROM articles LIMIT 1').get();
  assert.ok(articleRow, 'Article row should exist');
  const article = rowToArticle(articleRow);
  assert.ok(article.id, 'Article should have valid ID');
  assert.ok(article.slug, 'Article should have valid slug');
  assert.ok(Array.isArray(article.authors), 'Authors should be parsed as array');
});

test('2. Security: Draft Isolation for Public Access', () => {
  const testDraftId = `draft-test-${Date.now()}`;
  const testDraft: Article = {
    id: testDraftId,
    slug: `test-draft-slug-${Date.now()}`,
    title: 'Gizli Savunma Analizi (Taslak)',
    dek: 'Yalnızca yönetici görmelidir',
    abstract: 'Gizli özet',
    authors: [{ name: 'Alperen Toker', affiliation: 'LENS' }],
    date: '2026-10-03',
    displayDate: '3 Ekim 2026',
    readingTime: '5 dk',
    version: 'v1.0',
    category: 'Kenar Yapay Zeka',
    tags: ['Test'],
    status: 'draft', // DRAFT STATUS
    doi: '',
    content: 'Çok gizli içerik',
    bibtex: '',
  };

  saveArticle(testDraft);

  // Simulate Public Query (status = 'published')
  const publicArticles = db.prepare("SELECT * FROM articles WHERE status = 'published'").all().map(rowToArticle);
  const foundInPublic = publicArticles.some(a => a.id === testDraftId);
  assert.equal(foundInPublic, false, 'Draft article must NOT appear in public query');

  // Simulate Admin Query (all statuses)
  const adminArticles = db.prepare('SELECT * FROM articles').all().map(rowToArticle);
  const foundInAdmin = adminArticles.some(a => a.id === testDraftId);
  assert.equal(foundInAdmin, true, 'Draft article must appear in admin query');

  // Clean up test draft
  db.prepare('DELETE FROM articles WHERE id = ?').run(testDraftId);
});

test('3. Cryptography: Scrypt Password Hashing and Timing-Safe Verification', async () => {
  const rawPassword = 'super-secret-tactical-pass-2026';
  const { hash, salt } = await hashPassword(rawPassword);

  assert.ok(hash.length >= 64, 'Derived key should be at least 64 bytes (hex: 128 chars)');
  assert.ok(salt.length >= 32, 'Salt should be random 32 bytes (hex: 64 chars)');

  const isValid = await verifyPassword(rawPassword, hash, salt);
  assert.equal(isValid, true, 'Valid password must verify correctly');

  const isInvalid = await verifyPassword('wrong-password', hash, salt);
  assert.equal(isInvalid, false, 'Invalid password must be rejected');
});

test('4. Rate Limiting: Progressive Lockout Protection', () => {
  const testIp = '192.168.1.99';
  resetRateLimit(testIp);

  // First 4 attempts should be allowed without lockout
  for (let i = 1; i <= 4; i++) {
    recordFailedAttempt(testIp);
    const check = checkRateLimit(testIp);
    assert.equal(check.allowed, true, `Attempt ${i} should still be allowed`);
  }

  // 5th attempt triggers 60s cooldown
  const attempt5 = recordFailedAttempt(testIp);
  assert.ok(attempt5.lockoutSeconds >= 60, '5th failed attempt must trigger at least 60s lockout');

  const lockedCheck = checkRateLimit(testIp);
  assert.equal(lockedCheck.allowed, false, 'Rate limit must reject after 5 failed attempts');
  assert.ok((lockedCheck.retryAfterSeconds || 0) > 0, 'Retry-after must be positive');

  // Reset rate limit
  resetRateLimit(testIp);
  const afterReset = checkRateLimit(testIp);
  assert.equal(afterReset.allowed, true, 'After reset, IP should be allowed immediately');
});

test('5. Session: Token Generation and Expiration Tracking', () => {
  const token = createSession();
  assert.ok(token && token.length === 64, 'Session token should be 32-byte hex (64 chars)');

  const tokenHash = hashToken(token);
  const sessionRow = db.prepare('SELECT * FROM sessions WHERE token = ?').get(tokenHash) as { expires_at: number } | undefined;
  assert.ok(sessionRow, 'Session must exist in database with hashed token');
  assert.ok(sessionRow.expires_at > Date.now(), 'Session expiration must be in the future');

  // Clean up
  destroySession(token);
  const afterDelete = db.prepare('SELECT * FROM sessions WHERE token = ?').get(tokenHash);
  assert.equal(afterDelete, undefined, 'Session must be deleted from database');
});

test('6. Session Security: Global Invalidation of All Sessions', () => {
  const t1 = createSession();
  const t2 = createSession();
  assert.ok(t1 && t2);

  destroyAllSessions();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
  assert.equal(countRow.count, 0, 'All sessions must be wiped on destroyAllSessions');
});

test('7. Search Engine: SQLite FTS5 Full-Text Search & Trigger Sync', () => {
  const ftsTestId = `fts-test-${Date.now()}`;
  const ftsTestArticle: Article = {
    id: ftsTestId,
    slug: `fts-unique-thermal-slug-${Date.now()}`,
    title: 'Benzersiz Termal Spektrometre Mimarisi',
    dek: 'Kızılötesi dalga boyu analizleri',
    abstract: 'LWIR 8-14um sensör kalibrasyonu',
    authors: [{ name: 'Alperen Toker', affiliation: 'LENS' }],
    date: '2026-10-05',
    displayDate: '5 Ekim 2026',
    readingTime: '4 dk',
    version: 'v1.0',
    category: 'Termal Görüntüleme',
    tags: ['FTS_TEST', 'LWIR_UNIK'],
    status: 'published',
    doi: '',
    content: 'Derin içerik bloğu: Bu makalede gizli anahtar kelime KAVRAMSAL_RADYOMETRI_TEST_99 geçmektedir.',
    bibtex: '',
  };

  // 1. Save article and verify trigger automatically syncs to articles_fts
  saveArticle(ftsTestArticle);

  const ftsCount = db.prepare('SELECT COUNT(*) as count FROM articles_fts WHERE id = ?').get(ftsTestId) as { count: number };
  assert.equal(ftsCount.count, 1, 'FTS5 trigger must automatically index newly inserted article');

  // 2. Query deep content keyword through FTS5
  const deepContentResults = db.prepare(`
    SELECT a.id, a.title, bm25(articles_fts) as rank
    FROM articles a
    JOIN articles_fts ON articles_fts.id = a.id
    WHERE articles_fts MATCH '"KAVRAMSAL_RADYOMETRI_TEST_99"*'
  `).all() as any[];

  assert.ok(deepContentResults.length >= 1, 'FTS5 must find article by unique deep content keyword');
  assert.equal(deepContentResults[0].id, ftsTestId, 'Matched article ID must be exact');

  // 3. Clean up and verify deletion trigger works
  db.prepare('DELETE FROM articles WHERE id = ?').run(ftsTestId);
  const ftsAfterDelete = db.prepare('SELECT COUNT(*) as count FROM articles_fts WHERE id = ?').get(ftsTestId) as { count: number };
  assert.equal(ftsAfterDelete.count, 0, 'FTS5 delete trigger must remove entry on article deletion');
});

test('8. Error Isolation: Resilient rowToArticle with Corrupted JSON', () => {
  const corruptRow = {
    id: 'corrupt-row-test',
    slug: 'corrupt-row-test',
    title: 'Bozuk JSON Test Makalesi',
    dek: '',
    abstract: '',
    authors: '{not-valid-json',
    date: '2026-10-05',
    displayDate: '',
    readingTime: '',
    version: '',
    category: 'Termal Görüntüleme',
    tags: '["ValidTag", invalid_json',
    status: 'published',
    doi: '',
    keywords: null,
    telemetry: 'undefined',
    tables: '[{broken}]',
    beforeAfterMedia: 'bad',
    series: 'broken',
    bibtex: '',
    content: 'Test content',
  };

  // Should NOT throw an exception, must safely fallback to defaults
  const parsed = rowToArticle(corruptRow);
  assert.equal(parsed.id, 'corrupt-row-test');
  assert.deepEqual(parsed.authors, []);
  assert.deepEqual(parsed.tags, []);
  assert.deepEqual(parsed.keywords, []);
  assert.deepEqual(parsed.telemetry, {});
  assert.deepEqual(parsed.tables, []);
  assert.equal(parsed.beforeAfterMedia, undefined);
  assert.equal(parsed.series, undefined);
});

test('9. Search Engine: Multi-Article FTS5 Keyword Matching', () => {
  // Query for 'TensorRT' should match the quantization article
  const tensorRtMatches = db.prepare(`
    SELECT a.id, a.title FROM articles a
    JOIN articles_fts ON articles_fts.id = a.id
    WHERE articles_fts MATCH '"TensorRT"*'
  `).all() as { id: string; title: string }[];

  assert.ok(tensorRtMatches.length >= 1, 'Search for TensorRT must return at least 1 match');
  assert.ok(tensorRtMatches.some(m => m.id === 'art-tensorrt-quantization'), 'TensorRT article must be in matches');

  // Query for 'LWIR' should match the sensor fusion article
  const lwirMatches = db.prepare(`
    SELECT a.id, a.title FROM articles a
    JOIN articles_fts ON articles_fts.id = a.id
    WHERE articles_fts MATCH '"LWIR"*'
  `).all() as { id: string; title: string }[];

  assert.ok(lwirMatches.length >= 1, 'Search for LWIR must return at least 1 match');
  assert.ok(lwirMatches.some(m => m.id === 'art-sensor-fusion-lwir'), 'LWIR fusion article must be in matches');
});

test('10. Sessions: Persistent SQLite Storage & Expiration Verification', () => {
  const token = createSession();
  const tokenHash = hashToken(token);

  const row = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(tokenHash) as { expires_at: number } | undefined;
  assert.ok(row, 'Session token must exist in SQLite sessions table');
  assert.ok(row.expires_at > Date.now(), 'Session must expire in future');

  destroySession(token);
  const rowAfter = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(tokenHash);
  assert.equal(rowAfter, undefined, 'Session token must be deleted from SQLite upon destroy');
});

