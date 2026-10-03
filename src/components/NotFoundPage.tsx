import React, { useEffect } from 'react';
import { ArrowLeft, Crosshair, FileQuestion, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NotFoundPageProps {
  onBackToArchive?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onBackToArchive }) => {
  useEffect(() => {
    document.title = '404 // Sayfa Bulunamadı — LENS';
    return () => {
      document.title = 'LENS // Bilgisayarlı Görü & Yapay Zeka Araştırmaları';
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="relative max-w-xl w-full p-8 sm:p-12 rounded-2xl border border-paper-300 dark:border-paper-800 bg-white/70 dark:bg-paper-850/70 backdrop-blur-md shadow-tactical-card text-center overflow-hidden">
        {/* Optical Corner Reticle Accents */}
        <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tactical-amber/60 pointer-events-none" />
        <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tactical-amber/60 pointer-events-none" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-paper-400 dark:border-paper-700 pointer-events-none" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-paper-400 dark:border-paper-700 pointer-events-none" />

        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-tactical-amber/5 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-tactical-amber/10 text-tactical-amber dark:text-amber-400 font-mono text-xs font-semibold uppercase tracking-wider mb-6 border border-tactical-amber/20">
          <Crosshair className="w-3.5 h-3.5 animate-pulse" />
          <span>TELEMETRİ HATASI // 404 SİNYAL YOK</span>
        </div>

        {/* Icon & Big Number */}
        <div className="w-16 h-16 rounded-2xl bg-paper-200 dark:bg-paper-800 text-tactical-amber mx-auto flex items-center justify-center mb-5 border border-paper-300 dark:border-paper-700">
          <FileQuestion className="w-8 h-8" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-ink-950 dark:text-paper-50 tracking-tight mb-3">
          Sayfa Bulunamadı
        </h1>

        <p className="text-base font-serif italic text-ink-600 dark:text-paper-300 max-w-md mx-auto leading-relaxed mb-8">
          Ulaşmaya çalıştığınız araştırma notu, teknik rapor veya sayfa dizini mevcut değil ya da taşınmış olabilir.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
          {onBackToArchive ? (
            <button
              onClick={onBackToArchive}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-tactical-blue text-white font-semibold hover:bg-tactical-blueDark transition-colors shadow-paper-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Arşive Dön</span>
            </button>
          ) : (
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-tactical-blue text-white font-semibold hover:bg-tactical-blueDark transition-colors shadow-paper-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Arşive Dön</span>
            </Link>
          )}

          <Link
            to="/?category=Tümü"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-200 hover:bg-paper-200/50 dark:hover:bg-paper-800/50 transition-colors"
          >
            <Compass className="w-4 h-4 text-tactical-amber" />
            <span>Tüm Yayınları Keşfet</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
