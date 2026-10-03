import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { AppConfig } from './config.ts';

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

export function mediaUsedBytes(db: Database.Database): number {
  const row = db.prepare(`SELECT COALESCE(SUM(size), 0) AS total FROM media`).get() as { total: number };
  return row.total || 0;
}

export function saveMediaFile(
  db: Database.Database,
  config: AppConfig,
  file: { name: string; type: string; size: number; data: Buffer },
): { ok: true; url: string; id: string } | { ok: false; message: string; status: number } {
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { ok: false, status: 415, message: 'Yalnızca JPEG, PNG, WebP, GIF ve PDF kabul edilir.' };
  }
  if (file.size <= 0 || file.size > config.maxUploadBytes) {
    return { ok: false, status: 413, message: 'Dosya boyutu sınırı aşıldı.' };
  }
  if (mediaUsedBytes(db) + file.size > config.mediaQuotaBytes) {
    return { ok: false, status: 507, message: 'Medya kotası doldu.' };
  }

  const id = randomBytes(12).toString('hex');
  const filename = `${id}${ext}`;
  fs.writeFileSync(path.join(config.uploadsDir, filename), file.data);
  db.prepare(
    `INSERT INTO media (id, filename, original_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, filename, file.name.slice(0, 180), file.type, file.size, new Date().toISOString());

  return { ok: true, id, url: `/uploads/${filename}` };
}

export function listMedia(db: Database.Database) {
  return db.prepare(`SELECT id, filename, original_name, mime, size, created_at FROM media ORDER BY created_at DESC`).all();
}

export function deleteAllMedia(db: Database.Database, config: AppConfig): void {
  const rows = db.prepare(`SELECT filename FROM media`).all() as Array<{ filename: string }>;
  for (const row of rows) {
    const full = path.join(config.uploadsDir, row.filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
  db.prepare(`DELETE FROM media`).run();
}
