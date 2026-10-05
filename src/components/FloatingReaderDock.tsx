import React, { useState, useEffect, useRef } from 'react';
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
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);

  // Scroll Progress and Direction Detection (Smart Mobile Auto-Hide UX)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          
          if (totalHeight > 0) {
            const currentProgress = Math.min(100, Math.max(0, (currentScrollY / totalHeight) * 100));
            setScrollProgress(Math.round(currentProgress));
          }

          // Mobile scroll direction detection (with threshold to prevent micro-jitter / rubber-banding)
          const diff = currentScrollY - lastScrollY.current;
          if (currentScrollY <= 40) {
            // Near top of document: always show dock
            setIsScrollingDown(false);
          } else if (diff > 8) {
            // Scrolling down: gracefully hide dock
            setIsScrollingDown(true);
            setIsTocOpen(false);
          } else if (diff < -8) {
            // Scrolling up: reveal dock immediately
            setIsScrollingDown(false);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
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

  // Mobile Single "Aa" Font-Size Cycler: sm -> base -> lg -> sm
  const cycleFontSize = () => {
    if (fontSize === 'sm') onChangeFontSize('base');
    else if (fontSize === 'base') onChangeFontSize('lg');
    else onChangeFontSize('sm');
  };

  // Determine transform state for mobile vs desktop
  const isMobileHidden = isScrollingDown;

  return (
    <>
      {/* MOBILE / QUICK TOC FLYOUT (Tactical Drawer) */}
      {isTocOpen && (
        <div 
          className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsTocOpen(false)}
        >
          <div 
            className="fixed bottom-16 md:bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md max-h-[60vh] overflow-y-auto rounded-xl border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-850 p-4 sm:p-5 shadow-2xl z-50 text-xs font-sans animate-in slide-in-from-bottom-3 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-200 dark:border-paper-800 text-[11px] font-mono uppercase text-ink-500">
              <span className="font-semibold text-tactical-amber">İÇİNDEKİLER DİZİNİ (TOC)</span>
              <span>%{scrollProgress} TAMAMLANDI</span>
            </div>
            <div className="space-y-1">
              {headings.length === 0 ? (
                <div className="text-center py-4 text-ink-400 font-mono text-xs">
                  Başlık bulunamadı
                </div>
              ) : (
                headings.map(h => (
                  <button
                    key={h.id}
                    onClick={() => handleTocClick(h.id)}
                    className={`w-full text-left py-2 px-2.5 rounded transition-colors text-xs font-sans ${
                      h.level === 3 ? 'pl-6 text-ink-600 dark:text-ink-400' : 'font-medium text-ink-900 dark:text-paper-100 hover:bg-paper-200 dark:hover:bg-paper-800'
                    }`}
                  >
                    {h.text}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING READER DOCK - Mobile First & Desktop Dual Architecture */}
      <aside 
        aria-label="Okuma Denetim Çubuğu"
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 bottom-2 md:bottom-6 w-[calc(100%-1rem)] max-w-[480px] md:w-auto md:max-w-none md:z-40 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 ${
          isMobileHidden 
            ? 'translate-y-[150%] opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto' 
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        {/* Desktop Minimized Pill (when user clicks chevron on desktop) */}
        {isHidden ? (
          <div className="flex justify-center w-full">
            <button
              onClick={() => setIsHidden(false)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/70 dark:border-neutral-800 md:border-paper-300/80 md:dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 md:bg-white/95 md:dark:bg-paper-900/95 backdrop-blur-md md:backdrop-blur-xl shadow-lg md:shadow-glass-dock text-ink-800 dark:text-paper-100 hover:scale-105 transition-all text-xs font-mono group"
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
          </div>
        ) : (
          /* Main Reader Dock Container */
          <div className="backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/70 dark:border-neutral-800 rounded-full shadow-lg px-2 sm:px-3 py-1.5 md:backdrop-blur-xl md:bg-white/85 md:dark:bg-paper-900/85 md:border-paper-300/80 md:dark:border-white/10 md:shadow-glass-dock md:px-3 md:py-2 text-ink-800 dark:text-paper-100 select-none animate-in fade-in zoom-in-95 duration-200">
            
            {/* Scrollable Track - Ensures 0% overflow on 320px devices */}
            <div className="flex items-center justify-between gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scrollbar-none w-full md:w-auto">
              
              {/* 1. Scroll Progress Dial / Back to Top */}
              <button
                onClick={scrollToTop}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-[10px] sm:text-[11px] font-mono transition-colors shrink-0"
                title="Başa Dön"
              >
                <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 -rotate-90">
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
                  <ArrowUp className="w-2 sm:w-2.5 h-2 sm:h-2.5 absolute text-tactical-blue" />
                </div>
                <span className="font-semibold text-ink-950 dark:text-paper-100">%{scrollProgress}</span>
              </button>

              <span className="w-px h-3.5 sm:h-4 bg-paper-300 dark:bg-white/10 shrink-0" />

              {/* 2. Format: Editorial vs IEEE Switch */}
              {/* Mobile View: Ultra-compact Segmented Switch */}
              <div className="flex md:hidden items-center rounded-full bg-paper-150/90 dark:bg-paper-800/90 p-0.5 text-[11px] font-mono border border-paper-300/60 dark:border-paper-700/60 shrink-0">
                <button
                  onClick={() => onToggleViewMode('web')}
                  className={`px-2 py-1 rounded-full transition-all text-[10px] font-semibold leading-none ${
                    viewMode === 'web'
                      ? 'bg-white dark:bg-paper-700 text-ink-950 dark:text-white shadow-xs'
                      : 'text-ink-600 dark:text-paper-300'
                  }`}
                  title="Web Görünümü"
                >
                  Web
                </button>
                <button
                  onClick={() => onToggleViewMode('pdf')}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-full transition-all text-[10px] font-semibold leading-none ${
                    viewMode === 'pdf'
                      ? 'bg-tactical-blue text-white shadow-xs'
                      : 'text-ink-600 dark:text-paper-300'
                  }`}
                  title="IEEE Rapor Formatı"
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>IEEE</span>
                </button>
              </div>

              {/* Desktop View: Full Editorial Switch (Unchanged on md:) */}
              <div className="hidden md:flex items-center rounded-full bg-paper-150 dark:bg-paper-800 p-0.5 text-xs font-mono border border-paper-300/60 dark:border-paper-700/60 shrink-0">
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

              <span className="w-px h-3.5 sm:h-4 bg-paper-300 dark:bg-white/10 shrink-0" />

              {/* 3. Typography Adjuster */}
              {/* Mobile View: Single Compact "Aa" Cycler Button */}
              <div className="flex md:hidden items-center shrink-0">
                <button
                  onClick={cycleFontSize}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-paper-150/90 dark:bg-paper-800/90 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-900 dark:text-paper-100 font-mono font-bold text-xs border border-paper-300/60 dark:border-paper-700/60 transition-transform active:scale-95 shrink-0"
                  title={`Yazı Boyutu: ${fontSize.toUpperCase()} (Değiştirmek için dokun)`}
                  aria-label="Yazı Boyutunu Değiştir"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="text-[11px] font-bold">Aa</span>
                    <span className="text-[8px] text-tactical-blue font-mono font-semibold">
                      {fontSize === 'sm' ? '-' : fontSize === 'lg' ? '+' : '•'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Desktop View: 3-Button A- / A / A+ Switcher (Unchanged on md:) */}
              <div className="hidden md:flex items-center rounded-full bg-paper-150 dark:bg-paper-800 p-0.5 text-xs font-mono border border-paper-300/60 dark:border-paper-700/60 shrink-0">
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

              <span className="w-px h-3.5 sm:h-4 bg-paper-300 dark:bg-white/10 shrink-0" />

              {/* 4. Quick TOC Icon */}
              <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={`w-7 h-7 flex items-center justify-center p-1 rounded-full transition-colors shrink-0 ${
                  isTocOpen 
                    ? 'bg-tactical-amber text-ink-950 font-bold' 
                    : 'hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300'
                }`}
                title="İçindekiler Dizini"
                aria-label="İçindekiler Dizini"
              >
                <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* 5. Fullscreen & Zen Mode Toggle */}
              <button
                onClick={onToggleZenMode}
                className={`w-7 h-7 flex items-center justify-center p-1 rounded-full transition-all shrink-0 ${
                  zenMode
                    ? 'bg-tactical-emerald text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300'
                }`}
                title={zenMode ? 'Tam Ekrandan Çık (Esc)' : 'Tam Ekran Modu'}
                aria-label={zenMode ? 'Tam Ekrandan Çık' : 'Tam Ekran Modu'}
              >
                {zenMode ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* 6. Dark Mode Switcher */}
              <button
                onClick={onToggleDarkMode}
                className="w-7 h-7 flex items-center justify-center p-1 rounded-full hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-paper-300 transition-colors shrink-0"
                title={darkMode ? 'Açık Mod' : 'Koyu Mod'}
                aria-label={darkMode ? 'Açık Mod' : 'Koyu Mod'}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tactical-amber" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* 7. Desktop-only Manual Minimize Button */}
              <div className="hidden md:flex items-center">
                <span className="w-px h-4 bg-paper-300 dark:bg-white/10 mx-0.5" />
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

            </div>
          </div>
        )}
      </aside>
    </>
  );
};
