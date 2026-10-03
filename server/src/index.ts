import { serve } from '@hono/node-server';
import { ensureAdmin } from './auth.ts';
import { createApp, seedIfEmpty } from './app.ts';
import { loadConfig } from './config.ts';
import { openDatabase } from './db.ts';

const config = loadConfig();
if (!config.sessionSecret || config.sessionSecret.length < 16) {
  console.error('SESSION_SECRET en az 16 karakter olmalı.');
  process.exit(1);
}

const db = openDatabase(config);
await ensureAdmin(db, config);
seedIfEmpty(db);

const app = createApp(db, config);

serve({ fetch: app.fetch, port: config.port }, info => {
  console.log(`LENS API http://127.0.0.1:${info.port}`);
});
