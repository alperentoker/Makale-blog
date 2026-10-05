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

    // Generate collision-resistant unique filename
    const randomSuffix = crypto.randomBytes(12).toString('hex');
    const safePrefix = (filename || 'figure')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const savedFileName = `${safePrefix}_${Date.now()}_${randomSuffix}${extension}`;
    const destinationPath = path.join(uploadsDir, savedFileName);

    await fs.promises.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/${savedFileName}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: savedFileName,
      size: buffer.length,
      mimeType,
    });
  } catch (err) {
    console.error('[LENS Upload Error]', err);
    res.status(500).json({ error: 'Görsel kaydedilirken bir hata oluştu.' });
  }
});
