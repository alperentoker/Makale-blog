import React from 'react';

interface ArchiveHeroProps {
  publishedCount: number;
}

export const ArchiveHero: React.FC<ArchiveHeroProps> = ({
  publishedCount,
}) => {
  return (
    <section className="relative border-b border-paper-300/35 dark:border-paper-800/40 bg-gradient-to-b from-paper-50/70 via-paper-50/20 to-transparent dark:from-paper-850/70 dark:via-paper-850/20 dark:to-transparent pt-7 pb-6 sm:pt-8 sm:pb-7 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
      {/* Subtle Ambient Vignette Glow */}
      <div className="absolute top-0 left-1/3 w-96 h-64 bg-tactical-blue/5 dark:bg-tactical-blue/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Gentle Bottom Fade-in Mask to Bridge Hero and Grid Substrate */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-paper-100/30 dark:to-paper-900/30 pointer-events-none" />

      <div className="max-w-[1720px] w-full mx-auto">
        {/* Top Identity Tag */}
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-tactical-blue/10 dark:bg-tactical-blue/20 text-tactical-blue dark:text-tactical-blueLight font-mono text-xs font-semibold uppercase tracking-wider mb-3 border border-tactical-blue/20">
          <span className="w-1.5 h-1.5 rounded-full bg-tactical-blue animate-pulse" />
          <span>LENS // ARAŞTIRMA NOTLARI</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-[2.65rem] font-serif font-bold text-ink-950 dark:text-paper-50 leading-[1.14] tracking-tight mb-2.5">
          Araştırma &amp; Mühendislik Notları
        </h1>

        {/* Clean, Simple & Grounded Subtitle */}
        <p className="text-base sm:text-lg font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed max-w-2xl mb-4">
          Bilgisayarlı görü, derin öğrenme ve yapay zeka sistemleri üzerine araştırma ve mühendislik notları.
        </p>

        {/* Basic Clean Metadata Strip - Tightened & Balanced Layout */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-10 pt-3.5 border-t border-paper-200/80 dark:border-paper-800/70 font-mono text-xs sm:text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-medium">YAZAR</div>
            <div className="text-sm sm:text-base font-bold text-ink-950 dark:text-paper-100 mt-0.5">
              Alperen Toker
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-paper-300/60 dark:bg-paper-800/80" />

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-medium">ODAK ALANI</div>
            <div className="mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs sm:text-sm font-semibold bg-paper-200/60 dark:bg-paper-800/70 text-ink-900 dark:text-paper-100 border border-paper-300/70 dark:border-paper-700/70 select-none">
                Bilgisayarlı Görü &amp; Yapay Zeka
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-paper-300/60 dark:bg-paper-800/80" />

          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 font-medium">YAYINLANAN</div>
            <div className="text-sm sm:text-base font-bold text-ink-950 dark:text-paper-100 mt-0.5">
              {publishedCount} Makale
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
