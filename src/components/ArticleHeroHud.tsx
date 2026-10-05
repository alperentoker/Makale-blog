import React from 'react';
import { 
  Crosshair, 
  Cpu, 
  Eye, 
  Zap, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  GitBranch, 
  Share2, 
  Check
} from 'lucide-react';
import { Article } from '../types';

interface ArticleHeroHudProps {
  article: Article;
  onShare: () => void;
  copiedLink: boolean;
}

export const ArticleHeroHud: React.FC<ArticleHeroHudProps> = ({
  article,
  onShare,
  copiedLink,
}) => {
  return (
    <header className="relative w-full mb-12 sm:mb-16">
      {/* Tactical Ambient Glow (Subtle FLIR Vizor Depth) */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-gradient-to-b from-tactical-blue/5 via-tactical-amber/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Mission Identification Band */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-6 border-b border-paper-300 dark:border-paper-800 text-[11px] font-mono tracking-wider">
        <div className="flex items-center gap-2 text-tactical-amber font-semibold uppercase">
          <Crosshair className="w-3.5 h-3.5 animate-pulse text-tactical-amber" />
          <span>FLIR LWIR & EDGE AI BENCHMARK // TELEMETRY HUD</span>
        </div>

        <div className="flex items-center gap-3 text-ink-500 dark:text-ink-400">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tactical-emerald animate-ping" />
            <span className="text-tactical-emerald font-medium">NUC CALIBRATED</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>OPTICAL RETICLE: 1.0X</span>
          <span>·</span>
          <span className="text-ink-700 dark:text-paper-300 font-semibold">ACADEMIC OPEN ACCESS</span>
        </div>
      </div>



      {/* Main Headline (High-Contrast Editorial Serif) */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5.5xl font-serif font-bold text-ink-950 dark:text-paper-50 leading-[1.14] tracking-tight mb-5">
        {article.title}
      </h1>

      {/* Dek / Editorial Hypothesis Subtitle */}
      {article.dek && (
        <p className="text-lg sm:text-xl font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed max-w-5xl mb-8">
          {article.dek}
        </p>
      )}

      {/* TACTICAL TELEMETRY HUD CARD (Linear / Stripe Press Aesthetic) */}
      <div className="reticle-box my-8 p-4 sm:p-5 rounded-lg border border-paper-300 dark:border-paper-800 bg-white/70 dark:bg-paper-850/80 backdrop-blur-md shadow-paper-md">
        {/* HUD Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-paper-200 dark:border-paper-800 text-[11px] font-mono uppercase text-ink-500 dark:text-ink-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-tactical-blue" />
            <span className="font-semibold text-ink-800 dark:text-paper-100 tracking-wider">
              DENEY PROTOKOLÜ // SABİT HESAPLAMA BÜTÇESİ
            </span>
          </div>
          <span className="hidden sm:inline text-tactical-amber font-semibold">
            4x GPU · 100 EPOCH KİLİTLİ REÇETE
          </span>
        </div>

        {/* 4 HUD Metric Modules (Reflecting Roadmap Parameters) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono">
          {/* Module 1: Training Budget */}
          <div className="p-3 rounded bg-paper-150/70 dark:bg-paper-900/60 border border-paper-200 dark:border-paper-800/80">
            <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
              <span>HESAPLAMA BÜTÇESİ</span>
              <Cpu className="w-3 h-3 text-tactical-amber" />
            </div>
            <div className="text-base sm:text-lg font-bold text-ink-950 dark:text-paper-50 tracking-tight">
              4x GPU · 100E
            </div>
            <div className="text-[10px] text-ink-600 dark:text-paper-300 font-sans mt-0.5">
              Dağıtık Paralel (DDP)
            </div>
          </div>

          {/* Module 2: Spectral & Sensor Spec */}
          <div className="p-3 rounded bg-paper-150/70 dark:bg-paper-900/60 border border-paper-200 dark:border-paper-800/80">
            <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
              <span>GİRİŞ &amp; BANT</span>
              <Eye className="w-3 h-3 text-tactical-blue" />
            </div>
            <div className="text-base sm:text-lg font-bold text-ink-950 dark:text-paper-50 tracking-tight">
              imgsz: 640
            </div>
            <div className="text-[10px] text-ink-600 dark:text-paper-300 font-sans mt-0.5 truncate">
              EO/IR Çift Modlu Havuz
            </div>
          </div>

          {/* Module 3: Model Families */}
          <div className="p-3 rounded bg-paper-150/70 dark:bg-paper-900/60 border border-paper-200 dark:border-paper-800/80">
            <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
              <span>MİMARİ EKOLÜ</span>
              <Zap className="w-3 h-3 text-tactical-emerald" />
            </div>
            <div className="text-base sm:text-lg font-bold text-ink-950 dark:text-paper-50 tracking-tight truncate">
              4 Farklı Ekol
            </div>
            <div className="text-[10px] text-tactical-emerald dark:text-emerald-400 font-sans mt-0.5">
              YOLO, Transformer, NMS-Free
            </div>
          </div>

          {/* Module 4: Dataset Leakage Audit */}
          <div className="p-3 rounded bg-paper-150/70 dark:bg-paper-900/60 border border-paper-200 dark:border-paper-800/80">
            <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1">
              <span>SAKLI DOĞRULAMA</span>
              <ShieldCheck className="w-3 h-3 text-cyan-500" />
            </div>
            <div className="text-base sm:text-lg font-bold text-ink-950 dark:text-paper-50 tracking-tight">
              14.403 Frame
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans mt-0.5">
              Sızıntısız Saklı Küme
            </div>
          </div>
        </div>
      </div>

      {/* Author & Editorial Metadata Footer Bar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans border-b border-paper-300 dark:border-paper-800 pb-5">
        {/* Author Avatar & Role */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tactical-blue text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm ring-2 ring-tactical-blue/20">
            {article.authors[0]?.name.charAt(0) || 'A'}
          </div>
          <div>
            <div className="font-semibold text-ink-950 dark:text-paper-50 flex items-center gap-2">
              <span>{article.authors[0]?.name || 'Alperen Toker'}</span>
              <span className="px-1.5 py-0.2 rounded bg-paper-200 dark:bg-paper-800 text-[10px] font-mono text-tactical-blue dark:text-tactical-blueLight font-medium">
                BAŞ ARAŞTIRMACI
              </span>
            </div>
            <div className="text-ink-500 dark:text-ink-400 text-[11px] font-mono mt-0.5">
              {article.authors[0]?.affiliation || 'Yapay Zeka & Bilgisayarlı Görü'}
            </div>
          </div>
        </div>

        {/* Badges & Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 font-mono text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-paper-200/80 dark:bg-paper-800/80 text-ink-700 dark:text-paper-200 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-tactical-blue" />
            <span>{article.displayDate}</span>
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-paper-200/80 dark:bg-paper-800/80 text-ink-700 dark:text-paper-200 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-tactical-amber" />
            <span>{article.readingTime}</span>
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-tactical-amber/10 text-tactical-amberDark dark:text-tactical-amber border border-tactical-amber/30 text-[11px] font-semibold">
            <GitBranch className="w-3 h-3" />
            <span>{article.version}</span>
          </span>

          {/* Share Button */}
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-800 dark:text-paper-100 border border-paper-300 dark:border-paper-700 transition-colors text-[11px]"
            title="Bağlantıyı Kopyala"
          >
            {copiedLink ? (
              <>
                <Check className="w-3 h-3 text-tactical-emerald" />
                <span className="text-tactical-emerald font-medium">Kopyalandı</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-ink-600 dark:text-paper-300" />
                <span>Paylaş</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
