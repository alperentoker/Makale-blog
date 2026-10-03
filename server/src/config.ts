import path from 'node:path';

function env(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

export function loadConfig() {
  const dataDir = path.resolve(env('DATA_DIR', './data'));
  const publicOrigin = env('PUBLIC_ORIGIN', 'http://127.0.0.1:5173').replace(/\/$/, '');
  const isHttps = publicOrigin.startsWith('https:');

  return {
    port: Number(env('PORT', '8787')) || 8787,
    dataDir,
    dbPath: path.join(dataDir, 'lens.sqlite'),
    uploadsDir: path.join(dataDir, 'uploads'),
    distDir: path.resolve(env('DIST_DIR', './dist')),
    adminPassword: env('ADMIN_PASSWORD'),
    sessionSecret: env('SESSION_SECRET'),
    publicOrigin,
    cookieSecure: env('COOKIE_SECURE') === 'true' || isHttps,
    trustProxy: env('TRUST_PROXY') === '1' || env('TRUST_PROXY') === 'true',
    mediaQuotaBytes: Number(env('MEDIA_QUOTA_BYTES', String(200 * 1024 * 1024))) || 200 * 1024 * 1024,
    maxUploadBytes: Number(env('MAX_UPLOAD_BYTES', String(12 * 1024 * 1024))) || 12 * 1024 * 1024,
    sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
    minPasswordLength: 10,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
