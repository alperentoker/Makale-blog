import { Router, Request, Response } from 'express';
import {
  isMasterPasswordSet,
  setMasterPassword,
  verifyMasterPassword,
  createSession,
  destroySession,
  destroyAllSessions,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  requireAuth,
} from '../auth.ts';

export const authRouter = Router();

// Helper to determine client IP (relies on Express trust proxy for spoof-safe IP)
function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// 1. Auth Status Check
authRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    isPasswordSet: isMasterPasswordSet(),
    authenticated: !!req.authenticated,
  });
});

// 2. First-Run Master Password Setup
authRouter.post('/setup', async (req: Request, res: Response) => {
  if (isMasterPasswordSet()) {
    res.status(400).json({ error: 'Yönetici parolası zaten belirlenmiş.' });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Parola en az 8 karakter uzunluğunda olmalıdır.' });
    return;
  }

  await setMasterPassword(password);
  const token = createSession();

  // Set secure HttpOnly cookie
  res.cookie('lens_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    success: true,
    message: 'Yönetici parolası başarıyla kaydedildi.',
    authenticated: true,
  });
});

// 3. Login with Brute-Force Rate Limiting
authRouter.post('/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: `Çok fazla başarısız deneme yapıldı. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
      lockout: true,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return;
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Parola gereklidir.' });
    return;
  }

  if (!isMasterPasswordSet()) {
    res.status(400).json({
      error: 'İlk kurulum henüz yapılmadı. Lütfen önce parolayı ayarlayın.',
      firstRunRequired: true,
    });
    return;
  }

  const isValid = await verifyMasterPassword(password);

  if (!isValid) {
    const { attempts, lockoutSeconds } = recordFailedAttempt(ip);
    if (lockoutSeconds > 0) {
      res.status(429).json({
        error: `Hatalı parola. Sistem güvenliği için ${lockoutSeconds} saniye kilitlendiniz.`,
        lockout: true,
        retryAfterSeconds: lockoutSeconds,
        attemptsRemaining: 0,
      });
      return;
    }

    const remaining = Math.max(0, 5 - attempts);
    res.status(401).json({
      error: `Hatalı parola. Kalan deneme hakkı: ${remaining}`,
      attemptsRemaining: remaining,
    });
    return;
  }

  // Reset rate limits on success
  resetRateLimit(ip);
  const token = createSession();

  // Set secure HttpOnly cookie
  res.cookie('lens_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    success: true,
    message: 'Giriş başarılı.',
    authenticated: true,
  });
});

// 4. Change Password (Protected)
authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Mevcut ve yeni parola belirtilmelidir.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'Yeni parola en az 8 karakter olmalıdır.' });
    return;
  }

  const isCurrentValid = await verifyMasterPassword(currentPassword);
  if (!isCurrentValid) {
    res.status(401).json({ error: 'Mevcut parola hatalı.' });
    return;
  }

  await setMasterPassword(newPassword);

  // Invalidate all existing sessions across devices
  destroyAllSessions();

  // Issue a fresh session for the current authenticated user
  const newSessionToken = createSession();
  res.cookie('lens_session', newSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    success: true,
    message: 'Parola başarıyla güncellendi. Diğer tüm aktif oturumlar sonlandırıldı.',
  });
});

// 5. Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.lens_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    destroySession(token);
  }

  res.clearCookie('lens_session', { path: '/' });
  res.json({ success: true, message: 'Oturum sonlandırıldı.' });
});
