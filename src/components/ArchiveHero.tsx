import React from 'react';

interface ArchiveHeroProps {
  publishedCount: number;
}

export const ArchiveHero: React.FC<ArchiveHeroProps> = ({
  publishedCount,
}) => {
  return (
    <section className="relative border-b border-paper-300 dark:border-paper-800 bg-paper-50/70 dark:bg-paper-850/60 backdrop-blur-md pt-14 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 overflow-hidden">
      {/* Subtle Ambient Vignette Glow */}
      <div className="absolute top-0 left-1/3 w-96 h-64 bg-tactical-blue/5 dark:bg-tactical-blue/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-[1720px] w-full mx-auto">
        {/* Top Identity Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-tactical-blue/10 dark:bg-tactical-blue/20 text-tactical-blue dark:text-tactical-blueLight font-mono text-xs font-semibold uppercase tracking-wider mb-6 border border-tactical-blue/20">
          <span className="w-2 h-2 rounded-full bg-tactical-blue animate-pulse" />
          <span>LENS // ALPEREN TOKER</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-ink-950 dark:text-paper-50 leading-[1.12] tracking-tight mb-5">
          Araştırma &amp; Mühendislik Notları
        </h1>

        {/* Clean, Simple & Grounded Subtitle */}
        <p className="text-lg sm:text-xl font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed max-w-2xl mb-8">
          Bilgisayarlı görü, derin öğrenme ve yapay zeka sistemleri üzerine araştırma ve mühendislik notları.
        </p>

        {/* Basic Clean Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-paper-200 dark:border-paper-800/80 font-mono text-xs sm:text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400">YAZAR</div>
            <div className="text-base font-bold text-ink-950 dark:text-paper-100 mt-1">
              Alperen Toker
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400">ODAK ALANI</div>
            <div className="text-base font-bold text-tactical-blue dark:text-blue-400 mt-1">
              Bilgisayarlı Görü &amp; Yapay Zeka
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400">YAYINLANAN</div>
            <div className="text-base font-bold text-ink-950 dark:text-paper-100 mt-1">
              {publishedCount} Makale
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
