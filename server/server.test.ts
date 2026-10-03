import test from 'node:test';
import assert from 'node:assert/strict';
import { db, saveArticle, rowToArticle } from './db.ts';
import {
  hashPassword,
  verifyPassword,
  createSession,
  isMasterPasswordSet,
  setMasterPassword,
  verifyMasterPassword,
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

test('3. Cryptography: Scrypt Password Hashing and Timing-Safe Verification', () => {
  const rawPassword = 'super-secret-tactical-pass-2026';
  const { hash, salt } = hashPassword(rawPassword);

  assert.ok(hash.length >= 64, 'Derived key should be at least 64 bytes (hex: 128 chars)');
  assert.ok(salt.length >= 32, 'Salt should be random 32 bytes (hex: 64 chars)');

  const isValid = verifyPassword(rawPassword, hash, salt);
  assert.equal(isValid, true, 'Valid password must verify correctly');

  const isInvalid = verifyPassword('wrong-password', hash, salt);
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

  const sessionRow = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as { expires_at: number } | undefined;
  assert.ok(sessionRow, 'Session must exist in database');
  assert.ok(sessionRow.expires_at > Date.now(), 'Session expiration must be in the future');

  // Clean up
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
});
