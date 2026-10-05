import React, { useState, useRef } from 'react';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  UploadCloud, 
  Database, 
  Trash2 
} from 'lucide-react';
import { Article } from '../../types';
import { changeMasterPassword } from '../../lib/auth';

interface AdminSettingsTabProps {
  articles: Article[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onImportArticles?: (newArticles: Article[]) => void;
  onSeedDemoData?: () => void;
  onWipeAllArticles?: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  articles,
  showToast,
  onImportArticles,
  onSeedDemoData,
  onWipeAllArticles,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Yeni parola en az 8 karakter olmalıdır.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Yeni parolalar birbiriyle eşleşmiyor.' });
      return;
    }

    const res = await changeMasterPassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordStatus({ type: 'success', message: 'Yönetici parolası başarıyla güncellendi.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Parola başarıyla güncellendi.', 'success');
    } else {
      setPasswordStatus({ type: 'error', message: res.message || 'Mevcut parola hatalı.' });
    }
  };

  const exportAllArticlesJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(articles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lens-articles-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Tüm veritabanı JSON yedeği indirildi.', 'success');
  };

  const handleRestoreJsonBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (confirm(`${parsed.length} adet makale içeren yedek yüklensin mi?`)) {
          if (onImportArticles) {
            onImportArticles(parsed);
            showToast(`${parsed.length} makale başarıyla geri yüklendi!`, 'success');
          }
        }
      } else {
        showToast('Geçersiz JSON yedek dosyası formatı.', 'error');
      }
    } catch {
      showToast('Yedek dosyası okunurken hata oluştu.', 'error');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50">
          Güvenlik, Yedekleme & Sistem Ayarları
        </h2>
        <p className="text-xs text-ink-500 font-sans mt-1">
          Yönetici parolası güncellemesi, tam JSON veritabanı yedeği ve gizli erişim rotası.
        </p>
      </div>

      {/* Secret URL Info Box */}
      <div className="p-5 mb-8 rounded border border-tactical-200 dark:border-tactical-800 bg-tactical-50/60 dark:bg-tactical-950/40">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-tactical-800 dark:text-tactical-400 mb-1">
          <Key className="w-4 h-4" />
          <span>GİZLİ YÖNETİM ERİŞİM ROTASI & KISAYOLLAR</span>
        </div>
        <p className="text-xs text-ink-700 dark:text-paper-300 font-sans leading-relaxed mb-2">
          Platformda ana sayfada hiçbir admin butonu bulunmaz. Bu yönetim paneline girmek için URL sonuna doğrudan <code className="font-mono bg-white dark:bg-paper-800 px-1.5 py-0.5 rounded font-bold">/#admin</code> ekleyebilirsiniz. Ayrıca klavyeden <kbd className="font-mono bg-white dark:bg-paper-800 px-1.5 py-0.5 rounded text-[11px]">Alt+A</kbd> kısayolu ile açabilirsiniz.
        </p>
        <div className="text-[11px] font-mono text-tactical-700 dark:text-tactical-400">
          Varsayılan Master Parola: <strong>lens2026</strong>
        </div>
      </div>

      {/* Password Change Box */}
      <div className="p-6 mb-8 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
        <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-4">
          Yönetici Parolasını Güncelle
        </h3>

        {passwordStatus && (
          <div
            className={`p-3 rounded text-xs flex items-center gap-2 mb-4 ${
              passwordStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {passwordStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{passwordStatus.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
              MEVCUT PAROLA (veya lens2026)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
              YENİ PAROLA (EN AZ 8 KARAKTER)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
              YENİ PAROLA TEKRARI
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs font-medium transition-colors"
          >
            Parolayı Güncelle
          </button>
        </form>
      </div>

      {/* FULL DATABASE BACKUP & RESTORE */}
      <div className="p-6 mb-8 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
        <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-2">
          Veritabanı Yedekleme & Geri Yükleme (JSON)
        </h3>
        <p className="text-xs text-ink-500 font-sans mb-4">
          Tüm makaleleri tek dosya olarak bilgisayarınıza yedekleyebilir veya daha önce aldığınız bir yedeği sisteme aktarabilirsiniz.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportAllArticlesJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tüm Veritabanını İndir (.json Yedek)</span>
          </button>

          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleRestoreJsonBackup(e.target.files[0]);
              }
            }}
          />

          <button
            onClick={() => backupInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 text-ink-800 dark:text-paper-200 border border-paper-300 dark:border-paper-700 font-mono text-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Yedekten Geri Yükle (.json)</span>
          </button>
        </div>
      </div>

      {/* Demo Data / Wipe Options */}
      <div className="p-6 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
        <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-2">
          Sistem Veritabanı Sıfırlama
        </h3>
        <p className="text-xs text-ink-500 font-sans mb-4">
          İhtiyaç duyarsanız hazır benchmark yol haritası makalesini yeniden yükleyebilir veya tüm makaleleri temizleyebilirsiniz.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {onSeedDemoData && (
            <button
              onClick={() => {
                if (confirm('Hazır akademik benchmark makalesi yüklensin mi?')) {
                  onSeedDemoData();
                  showToast('Örnek benchmark makalesi başarıyla yüklendi.', 'success');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 text-ink-800 dark:text-paper-200 border border-paper-300 dark:border-paper-700 font-mono text-xs"
            >
              <Database className="w-3.5 h-3.5 text-tactical-800 dark:text-tactical-400" />
              <span>Örnek Benchmark Makalesini Yükle</span>
            </button>
          )}

          {onWipeAllArticles && articles.length > 0 && (
            <button
              onClick={() => {
                if (confirm('DİKKAT: TÜM makaleler silinecektir. Bu işlem geri alınamaz. Emin misiniz?')) {
                  onWipeAllArticles();
                  showToast('Tüm makaleler temizlendi.', 'info');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-mono text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Makaleleri Sıfırla (Temizle)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
