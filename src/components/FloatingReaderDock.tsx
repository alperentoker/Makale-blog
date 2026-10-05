import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Maximize2, 
  Minimize2, 
  Moon, 
  Sun, 
  ListOrdered, 
  ArrowUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TocHeading } from '../types';

interface FloatingReaderDockProps {
  viewMode: 'web' | 'pdf';
  onToggleViewMode: (mode: 'web' | 'pdf') => void;
  fontSize: 'sm' | 'base' | 'lg';
  onChangeFontSize: (size: 'sm' | 'base' | 'lg') => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  headings: TocHeading[];
}

export const FloatingReaderDock: React.FC<FloatingReaderDockProps> = ({
  viewMode,
  onToggleViewMode,
  fontSize,
  onChangeFontSize,
  zenMode,
  onToggleZenMode,
  darkMode,
  onToggleDarkMode,
  headings,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(Math.round(currentProgress));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setIsTocOpen(false);
    }
  };

  return (
    <>
      {/* MOBILE / QUICK TOC FLYOUT (Tactical Drawer) */}
      {isTocOpen && (
        <div 
          className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsTocOpen(false)}
        >
          <div 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92vw] max-w-md max-h-[60vh] overflow-y-auto rounded-xl border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-850 p-5 shadow-2xl z-50 text-xs font-sans animate-in slide-in-from-bottom-4 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-200 dark:border-paper-800 text-[11px] font-mono uppercase text-ink-500">
              <span className="font-semibold text-tactical-amber">İÇİNDEKİLER DİZİNİ (TOC)</span>
              <span>%{scrollProgress} TAMAMLANDI</span>
            </div>
            <div className="space-y-1">
              {headings.map(h => (
                <button
                  key={h.id}
                  onClick={() => handleTocClick(h.id)}
                  className={`w-full text-left py-2 px-2.5 rounded transition-colors text-xs font-sans ${
                    h.level === 3 ? 'pl-6 text-ink-600 dark:text-ink-400' : 'font-medium text-ink-900 dark:text-paper-100 hover:bg-paper-200 dark:hover:bg-paper-800'
                  }`}
                >
                  {h.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING GLASS DOCK (Fixed Bottom Center) */}
      <aside 
        aria-label="Okuma Denetim Çubuğu"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300"
      >
        {isHidden ? (
          <button
            onClick={() => setIsHidden(false)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-paper-300/80 dark:border-white/10 bg-white/95 dark:bg-paper-900/95 backdrop-blur-xl shadow-glass-dock text-ink-800 dark:text-paper-100 hover:scale-105 hover:bg-paper-100 dark:hover:bg-paper-800 transition-all text-xs font-mono group"
            title="Okuma Menüsünü Aç"
            aria-label="Okuma Menüsünü Aç"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <svg className="w-4 h-4 -rotate-90">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  className="stroke-paper-300 dark:stroke-paper-700 fill-none"
                  strokeWidth="2"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  className="stroke-tactical-blue fill-none transition-all duration-150"
                  strokeWidth="2"
                  strokeDasharray="38"
                  strokeDashoffset={38 - (38 * scrollProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="font-semibold text-[11px] text-ink-900 dark:text-paper-100">%{scrollProgress}</span>
            <span className="w-px h-3 bg-paper-300 dark:bg-white/10" />
            <span className="text-[11px] font-medium text-ink-600 dark:text-paper-300">Menü</span>
            <ChevronUp className="w-3.5 h-3.5 text-tactical-blue group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 px-3 py-2 rounded-full border border-paper-300/80 dark:border-white/10 bg-white/85 dark:bg-paper-900/85 backdrop-blur-xl shadow-glass-dock text-ink-800 dark:text-paper-100 select-none animate-in fade-in zoom-in-95 duration-200">
          
          {/* Scroll Progress Dial */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-[11px] font-mono transition-colors"
            title="Başa Dön"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <svg className="w-5 h-5 -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className="stroke-paper-300 dark:stroke-paper-700 fill-none"
                  strokeWidth="2"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className="stroke-tactical-blue fill-none transition-all duration-150"
                  strokeWidth="2"
                  strokeDasharray="44"
                  strokeDashoffset={44 - (44 * scrollProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <ArrowUp className="w-2.5 h-2.5 absolute text-tactical-blue" />
            </div>
            <span className="font-semibold text-ink-900 dark:text-paper-100">%{scrollProgress}</span>
          </button>

          <span className="w-px h-4 bg-paper-300 dark:bg-white/10 mx-0.5" />

          {/* View Mode Toggle: Editorial vs IEEE PDF */}
          <div className="flex items-center rounded-full bg-paper-150 dark:bg-paper-800 p-0.5 text-xs font-mono border border-paper-300/60 dark:border-paper-700/60">
            <button
              onClick={() => onToggleViewMode('web')}
              className={`px-3 py-1 rounded-full transition-all text-[11px] font-semibold ${
                viewMode === 'web'
                  ? 'bg-white dark:bg-paper-700 text-ink-950 dark:text-white shadow-sm border border-paper-300/80 dark:border-paper-600/60'
                  : 'text-ink-600 dark:text-paper-300 hover:text-ink-950 dark:hover:text-white'
              }`}
            >
              Editoryal
            </button>
            <button
              onClick={() => onToggleViewMode('pdf')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all text-[11px] font-semibold ${
                viewMode === 'pdf'
                  ? 'bg-tactical-blue text-white shadow-sm'
                  : 'text-ink-600 dark:text-paper-300 hover:text-ink-950 dark:hover:text-white'
              }`}
              title="IEEE Transactions İki Sütunlu Bildiri Formatı"
            >
              <FileText className="w-3 h-3" />
              <span>IEEE</span>
            </button>
          </div>

          <span className="w-px h-4 bg-paper-300 dark:bg-paper-700 mx-0.5" />

          {/* Font Size Adjuster */}
          <div className="flex items-center rounded-full bg-paper-150 dark:bg-paper-800 p-0.5 text-xs font-mono border border-paper-300/60 dark:border-paper-700/60">
            <button
              onClick={() => onChangeFontSize('sm')}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-all font-mono ${
                fontSize === 'sm'
                  ? 'bg-white dark:bg-paper-700 text-ink-950 dark:text-white font-bold shadow-sm border border-paper-300/80 dark:border-paper-600/60'
                  : 'text-ink-600 dark:text-paper-300 hover:text-ink-950 dark:hover:text-white'
              }`}
              title="Kompakt Yazı Boyutu (A-)"
            >
              A-
            </button>
            <button
              onClick={() => onChangeFontSize('base')}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-all font-mono ${
                fontSize === 'base'
                  ? 'bg-white dark:bg-paper-700 text-ink-950 dark:text-white font-bold shadow-sm border border-paper-300/80 dark:border-paper-600/60'
                  : 'text-ink-600 dark:text-paper-300 hover:text-ink-950 dark:hover:text-white'
              }`}
              title="Standart Yazı Boyutu (A)"
            >
              A
            </button>
            <button
              onClick={() => onChangeFontSize('lg')}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] transition-all font-mono ${
                fontSize === 'lg'
                  ? 'bg-white dark:bg-paper-700 text-ink-950 dark:text-white font-bold shadow-sm border border-paper-300/80 dark:border-paper-600/60'
                  : 'text-ink-600 dark:text-paper-300 hover:text-ink-950 dark:hover:text-white'
              }`}
              title="Geniş Yazı Boyutu (A+)"
            >
              A+
            </button>
          </div>

          <span className="w-px h-4 bg-paper-300 dark:bg-white/10 mx-0.5" />

          {/* Quick TOC Button */}
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className={`p-1.5 rounded-full transition-colors ${
              isTocOpen 
                ? 'bg-tactical-amber text-ink-950 font-bold' 
                : 'hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300'
            }`}
            title="İçindekiler Dizini"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Fullscreen & Zen Mode Toggle */}
          <button
            onClick={onToggleZenMode}
            className={`p-1.5 rounded-full transition-all ${
              zenMode
                ? 'bg-tactical-emerald text-white shadow-sm ring-2 ring-emerald-500/30'
                : 'hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300'
            }`}
            title={zenMode ? 'Tam Ekrandan Çık (Esc)' : 'Tam Ekran Modu (F11)'}
            aria-label={zenMode ? 'Tam Ekrandan Çık' : 'Tam Ekran Modu'}
          >
            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Dark Mode Switcher */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300 transition-colors"
            title={darkMode ? 'Açık Mod (Tactical Warm Paper)' : 'Koyu Mod (FLIR Obsidian)'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-tactical-amber" /> : <Moon className="w-4 h-4" />}
          </button>

          <span className="w-px h-4 bg-paper-300 dark:bg-white/10 mx-0.5" />

          {/* Hide / Collapse Dock Button */}
          <button
            onClick={() => {
              setIsHidden(true);
              setIsTocOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-400 hover:text-ink-900 dark:text-paper-400 dark:hover:text-white transition-colors"
            title="Menüyü Gizle"
            aria-label="Menüyü Gizle"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
    </>
  );
};
