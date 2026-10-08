import { Article } from '../types';

const API_BASE = '/api';

export interface AuthStatusResponse {
  isPasswordSet: boolean;
  authenticated: boolean;
}

export interface LoginResult {
  success: boolean;
  authenticated: boolean;
  error?: string;
  lockout?: boolean;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  firstRunRequired?: boolean;
}

// 1. Fetch articles with optional category/search filters
export async function fetchArticles(params?: {
  category?: string;
  q?: string;
  status?: string;
}): Promise<Article[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'Tümü') query.set('category', params.category);
  if (params?.q?.trim()) query.set('q', params.q.trim());
  if (params?.status) query.set('status', params.status);

  const url = `${API_BASE}/articles${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    credentials: 'include', // Sends HttpOnly cookie
  });

  if (!res.ok) {
    throw new Error(`Makaleler alınamadı: HTTP ${res.status}`);
  }

  return res.json();
}

// 2. Fetch single article by id or slug
export async function fetchArticle(idOrSlug: string): Promise<Article> {
  const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(idOrSlug)}`, {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Makale bulunamadı: HTTP ${res.status}`);
  }

  return res.json();
}

// 3. Save article (auto-detects create vs update)
export async function saveArticleApi(article: Article): Promise<Article> {
  const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(article.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(article),
  });

  // If article not found in DB yet, create it
  if (res.status === 404) {
    const createRes = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(article),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error || 'Makale oluşturulamadı.');
    }
    return createRes.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Makale güncellenemedi.');
  }

  return res.json();
}

// 4. Delete article
export async function deleteArticleApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Makale silinemedi.');
  }
}

// 5. Batch import articles
export async function importArticlesApi(articles: Article[]): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/articles/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ articles }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Makaleler içe aktarılamadı.');
  }

  return res.json();
}

// 6. Seed demo articles
export async function seedDemoArticlesApi(): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/articles/seed`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-Lens-CSRF': '1',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Örnek makaleler yüklenemedi.');
  }

  return res.json();
}

// 7. Wipe all articles
export async function wipeAllArticlesApi(): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/wipe`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-Lens-CSRF': '1',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Makaleler silinemedi.');
  }
}

// 8. Auth Status Check
export async function checkAuthStatus(): Promise<AuthStatusResponse & { serverOnline: boolean; errorStatus?: number }> {
  try {
    const res = await fetch(`${API_BASE}/auth/status`, {
      credentials: 'include',
    });
    if (!res.ok) {
      return { isPasswordSet: true, authenticated: false, serverOnline: false, errorStatus: res.status };
    }
    const data = await res.json();
    return { ...data, serverOnline: true };
  } catch {
    return { isPasswordSet: true, authenticated: false, serverOnline: false };
  }
}

// 9. First-Run Master Password Setup
export async function setupMasterPasswordApi(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Lens-CSRF': '1',
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 502 || res.status === 503) {
        return { success: false, error: `Sunucu API servisi kapalı veya yanıt vermiyor (HTTP ${res.status} Bad Gateway). Lütfen backend servisini kontrol edin.` };
      }
      return { success: false, error: data.error || `İşlem başarısız (HTTP ${res.status}).` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.' };
  }
}

// 10. Login with Brute-Force Rate Limiting
export async function loginApi(password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Lens-CSRF': '1',
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 502 || res.status === 503) {
        return {
          success: false,
          authenticated: false,
          error: `Sunucu API servisi kapalı (HTTP ${res.status} Bad Gateway). Lütfen backend servisini kontrol edin.`,
        };
      }
      return {
        success: false,
        authenticated: false,
        error: data.error || `Giriş başarısız (HTTP ${res.status}).`,
        lockout: data.lockout,
        retryAfterSeconds: data.retryAfterSeconds,
        attemptsRemaining: data.attemptsRemaining,
        firstRunRequired: data.firstRunRequired,
      };
    }

    return {
      success: true,
      authenticated: true,
    };
  } catch (err: any) {
    return {
      success: false,
      authenticated: false,
      error: err?.message || 'Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.',
    };
  }
}

// 11. Change Password
export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Lens-CSRF': '1',
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Parola değiştirilemedi (HTTP ${res.status}).` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sunucuya bağlanılamadı.' };
  }
}

// 12. Logout
export async function logoutApi(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
}

// 13. Resolve Academic Identifier (arXiv ID or DOI)
export interface AcademicMetadataResult {
  success: boolean;
  source: 'arxiv' | 'crossref';
  metadata: Partial<Article>;
  error?: string;
}

export async function resolveAcademicIdentifierApi(identifier: string): Promise<AcademicMetadataResult> {
  const res = await fetch(`${API_BASE}/articles/resolve-academic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'include',
    body: JSON.stringify({ identifier }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Akademik metadata çözülemedi.');
  }
  return data;
}

// 14. Upload Image for Articles
export interface UploadResult {
  success: boolean;
  url: string;
  fileName: string;
  size: number;
}

export async function uploadImageApi(file: File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({
            image: base64Data,
            filename: file.name,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Görsel yüklenemedi.');
        }

        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
}

