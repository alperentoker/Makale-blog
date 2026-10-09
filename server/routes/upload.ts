import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { requireAuth } from '../auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRouter = Router();

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Supported image extensions and magic bytes
const MIME_EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/gif': '.gif',
};

// Maximum image size: 10MB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// Validate file content against the declared MIME type using magic bytes.
export function matchesMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  const hex = buffer.subarray(0, 4).toString('hex').toLowerCase();
  switch (mimeType) {
    case 'image/png':
      return hex === '89504e47';
    case 'image/jpeg':
    case 'image/jpg':
      return hex.startsWith('ffd8ff');
    case 'image/gif':
      return buffer.subarray(0, 3).toString('ascii') === 'GIF';
    case 'image/webp':
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'image/svg+xml':
      // SVG is text-based: only broaden the sniff when the content starts as XML/SVG/DOCTYPE.
      return /^\s*(<\?xml|<!--|<!doctype|<svg)/i.test(buffer.subarray(0, 256).toString('utf8'));
    default:
      return false;
  }
}

// Neutralise active content in uploaded SVGs (script tags, event handlers,
// javascript:/data: URLs and external references) so they cannot execute if
// later served from the same origin.
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<\s*script\b[^>]*>(?:[\s\S]*?<\s*\/\s*script\s*>)?/gi, '')
    .replace(/<\s*script\b[^>]*\/>/gi, '')
    .replace(/<\s*(iframe|object|embed|foreignObject|use|animate|set)[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href|src)\s*=\s*(?:"\s*(?:javascript|data|vbscript)[^"]*"|'\s*(?:javascript|data|vbscript)[^']*')/gi, '');
}

// POST /api/upload — Secure base64/data-uri image upload for authenticated administrators
uploadRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { image, filename } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Görsel verisi (base64/data URL) gereklidir.' });
      return;
    }

    // Match data:[<mediatype>][;base64],<data>
    const matches = image.match(/^data:([A-Za-z0-9+/+-]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }

    const extension = MIME_EXT_MAP[mimeType];
    if (!extension) {
      res.status(400).json({
        error: `Desteklenmeyen görsel formatı (${mimeType}). Yalnızca PNG, JPEG, WebP, SVG ve GIF desteklenir.`,
      });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      res.status(400).json({ error: 'Geçersiz veya boş görsel içeriği.' });
      return;
    }

    if (buffer.length > MAX_SIZE_BYTES) {
      res.status(400).json({ error: 'Görsel boyutu 10MB sınırını aşamaz.' });
      return;
    }

    // Reject content whose magic bytes do not match the declared MIME type.
    if (!matchesMagicBytes(buffer, mimeType)) {
      res.status(400).json({ error: 'Dosya içeriği belirtilen görsel formatıyla eşleşmiyor.' });
      return;
    }

    const payload = mimeType === 'image/svg+xml'
      ? Buffer.from(sanitizeSvg(buffer.toString('utf8')), 'utf8')
      : buffer;

    // Generate collision-resistant unique filename
    const randomSuffix = crypto.randomBytes(12).toString('hex');
    const safePrefix = (filename || 'figure')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const savedFileName = `${safePrefix}_${Date.now()}_${randomSuffix}${extension}`;
    const destinationPath = path.join(uploadsDir, savedFileName);

    await fs.promises.writeFile(destinationPath, payload);

    const publicUrl = `/uploads/${savedFileName}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: savedFileName,
      size: payload.length,
      mimeType,
    });
  } catch (err) {
    console.error('[LENS Upload Error]', err);
    res.status(500).json({ error: 'Görsel kaydedilirken bir hata oluştu.' });
  }
});
