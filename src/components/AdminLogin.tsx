import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, X, KeyRound } from 'lucide-react';
import { loginWithPassword, isMasterPasswordSet, setInitialPassword, fetchSession } from '../lib/auth';

interface AdminLoginProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(!isMasterPasswordSet());

  useEffect(() => {
    if (isOpen) {
      fetchSession().then(status => {
        setIsFirstRun(!status.isPasswordSet);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Lütfen parolanızı girin.');
      return;
    }

    setIsLoading(true);
    setError(null);

    if (isFirstRun) {
      // First-run: set initial password
      if (password.trim().length < 8) {
        setError('Parola en az 8 karakter olmalıdır.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Parolalar eşleşmiyor. Lütfen tekrar kontrol edin.');
        setIsLoading(false);
        return;
      }
      const result = await setInitialPassword(password);
      setIsLoading(false);
      if (result.success) {
        setPassword('');
        setConfirmPassword('');
        onSuccess();
      } else {
        setError(result.message || 'Parola oluşturulamadı.');
      }
    } else {
      // Normal login
      const result = await loginWithPassword(password);
      setIsLoading(false);
      if (result.success) {
        setPassword('');
        onSuccess();
      } else {
        setError(result.message || 'Geçersiz yönetici parolası.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/90 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 p-6 sm:p-8 shadow-2xl relative text-ink-900 dark:text-paper-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-500 hover:text-ink-900 dark:hover:text-paper-100 transition-colors"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Monogram & Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-12 h-12 rounded-full ${isFirstRun ? 'bg-tactical-emerald' : 'bg-tactical-800'} text-white flex items-center justify-center shadow-md mb-3`}>
            {isFirstRun ? <KeyRound className="w-5 h-5 text-emerald-100" /> : <Lock className="w-5 h-5 text-blue-200" />}
          </div>
          <div className="font-mono text-xs font-semibold tracking-widest text-tactical-800 dark:text-tactical-400 uppercase">
            {isFirstRun ? 'İLK KURULUM' : 'GÜVENLİ YÖNETİM KONSOLU'}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink-950 dark:text-paper-50 mt-1">
            {isFirstRun ? 'Yönetici Parolası Oluştur' : 'Yönetici Girişi'}
          </h2>
          <p className="text-xs text-ink-500 dark:text-ink-400 font-sans mt-1 max-w-xs">
            {isFirstRun
              ? 'İlk kullanım için güçlü bir yönetici parolası belirleyin. Bu parolayı güvenli bir yerde saklayın.'
              : 'Makale yayınlama, düzenleme ve belge içe aktarma yetkisi için doğrulama yapın.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-ink-700 dark:text-ink-300 mb-1.5">
              {isFirstRun ? 'YENİ YÖNETİCİ PAROLASI' : 'YÖNETİCİ PAROLASI'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isFirstRun ? 'En az 6 karakter...' : 'Parolanızı girin...'}
                className="w-full pl-3 pr-10 py-2.5 text-xs font-mono rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-2 focus:ring-tactical-800 dark:focus:ring-tactical-500 text-ink-900 dark:text-paper-50 placeholder:text-ink-400"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field for first-run setup */}
          {isFirstRun && (
            <div>
              <label className="block text-xs font-mono font-medium text-ink-700 dark:text-ink-300 mb-1.5">
                PAROLA TEKRARI
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Parolayı tekrar girin..."
                className="w-full pl-3 pr-3 py-2.5 text-xs font-mono rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-2 focus:ring-tactical-800 dark:focus:ring-tactical-500 text-ink-900 dark:text-paper-50 placeholder:text-ink-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded ${isFirstRun ? 'bg-tactical-emerald hover:bg-tactical-emeraldDark' : 'bg-tactical-800 hover:bg-tactical-900'} disabled:opacity-50 text-white font-mono text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <span>Doğrulanıyor...</span>
            ) : (
              <>
                <span>{isFirstRun ? 'Parolayı Oluştur ve Giriş Yap' : 'Stüdyo Konsoluna Giriş Yap'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-paper-200 dark:border-paper-800/80 text-[11px] font-sans text-ink-500 dark:text-ink-400 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SHA-256 Şifrelenmiş Oturum · Brute-Force Koruması Aktif</span>
          </div>
          <div className="text-ink-400 dark:text-ink-500">
            Yetkili araştırmacı erişimi kilit altındadır.
          </div>
        </div>
      </div>
    </div>
  );
};
