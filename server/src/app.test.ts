import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import argon2 from 'argon2';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDatabase } from './db.ts';

async function setup() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-'));
  process.env.DATA_DIR = dataDir;
  process.env.ADMIN_PASSWORD = 'test-password-ok';
  process.env.SESSION_SECRET = 'test-session-secret-16';
  process.env.PUBLIC_ORIGIN = 'http://127.0.0.1:8787';
  process.env.COOKIE_SECURE = 'false';
  const config = loadConfig();
  const db = openDatabase(config);
  const hash = await argon2.hash('test-password-ok', { type: argon2.argon2id });
  db.prepare(`INSERT INTO admin (id, password_hash, updated_at) VALUES (1, ?, ?)`).run(
    hash,
    new Date().toISOString(),
  );
  const app = createApp(db, config);
  return { app, db, dataDir };
}

test('public API hides drafts', async () => {
  const { app, db, dataDir } = await setup();
  db.prepare(
    `INSERT INTO articles (id, slug, payload, status, updated_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    'art-draft',
    'gizli-taslak',
    JSON.stringify({
      id: 'art-draft',
      slug: 'gizli-taslak',
      title: 'Gizli',
      dek: '',
      abstract: '',
      authors: [],
      date: '2026-01-01',
      displayDate: '',
      readingTime: '',
      version: '',
      category: 'Kenar Yapay Zeka',
      tags: [],
      status: 'draft',
      content: 'secret',
      bibtex: '',
    }),
    'draft',
    new Date().toISOString(),
  );

  const listed = await app.request('http://127.0.0.1/api/articles');
  assert.equal(listed.status, 200);
  const body = await listed.json();
  assert.equal(body.articles.length, 0);

  const hidden = await app.request('http://127.0.0.1/api/articles/gizli-taslak');
  assert.equal(hidden.status, 404);

  const unauthSave = await app.request('http://127.0.0.1/api/admin/articles/art-draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8787' },
    body: JSON.stringify({ id: 'art-draft', slug: 'x', title: 'x', content: 'x', status: 'published' }),
  });
  assert.equal(unauthSave.status, 401);
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('login cookie allows admin write and rejects bad password', async () => {
  const { app, dataDir } = await setup();
  const bad = await app.request('http://127.0.0.1/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8787' },
    body: JSON.stringify({ password: 'wrong-password' }),
  });
  assert.equal(bad.status, 401);

  const login = await app.request('http://127.0.0.1/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8787' },
    body: JSON.stringify({ password: 'test-password-ok' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie') || '';
  assert.match(cookie, /lens_sid=/);
  assert.match(cookie, /HttpOnly/i);

  const created = await app.request('http://127.0.0.1/api/admin/articles/art-1', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://127.0.0.1:8787',
      Cookie: cookie.split(';')[0],
    },
    body: JSON.stringify({
      id: 'art-1',
      slug: 'yayinlanan-yazi',
      title: 'Yayın',
      dek: 'dek',
      abstract: '',
      authors: [],
      date: '2026-10-03',
      displayDate: '',
      readingTime: '',
      version: '',
      category: 'Kenar Yapay Zeka',
      tags: [],
      status: 'published',
      content: 'merhaba',
      bibtex: '',
    }),
  });
  assert.equal(created.status, 200);

  const listed = await app.request('http://127.0.0.1/api/articles');
  const body = await listed.json();
  assert.equal(body.articles.length, 1);
  assert.equal(body.articles[0].slug, 'yayinlanan-yazi');
  fs.rmSync(dataDir, { recursive: true, force: true });
});
