import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Share2,
  Check
} from 'lucide-react';
import { Article, TocHeading } from '../types';
import { extractHeadings } from '../lib/parser';
import { MarkdownContent } from '../lib/markdownRenderer';
import { StickyToc } from './StickyToc';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { InteractiveTable } from './InteractiveTable';
import { MediaLightbox } from './MediaLightbox';
import { IeeePdfViewer } from './IeeePdfViewer';
import { ArticleHeroHud } from './ArticleHeroHud';
import { FloatingReaderDock } from './FloatingReaderDock';
import { copyToClipboard } from '../lib/clipboard';

interface ArticleReaderProps {
  article: Article;
  allArticles: Article[];
  onSelectArticle: (article: Article) => void;
  onBackToArchive: () => void;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  allArticles,
  onSelectArticle,
  onBackToArchive,
}) => {
  const [viewMode, setViewMode] = useState<'web' | 'pdf'>('web');
  const [copiedLink, setCopiedLink] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    try {
      const saved = localStorage.getItem('lens_reader_fontsize');
      if (saved === 'sm' || saved === 'base' || saved === 'lg') return saved;
    } catch {}
    return 'base';
  });
  const [zenMode, setZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? !!document.fullscreenElement : false;
  });
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Native Fullscreen API synchronization (ESC key & browser events)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen) {
        setZenMode(false);
        document.documentElement.classList.remove('zen-fullscreen-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.documentElement.classList.remove('zen-fullscreen-mode');
    };
  }, []);

  const handleToggleFullscreen = () => {
    const nextState = !zenMode && !isFullscreen;
    setZenMode(nextState);

    if (nextState) {
      document.documentElement.classList.add('zen-fullscreen-mode');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Native fullscreen might be restricted by browser sandbox, CSS class provides full fallback
        });
      }
    } else {
      document.documentElement.classList.remove('zen-fullscreen-mode');
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleFontSizeChange = (size: 'sm' | 'base' | 'lg') => {
    setFontSize(size);
    try {
      localStorage.setItem('lens_reader_fontsize', size);
    } catch {}
  };

  // Lightbox State
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    caption?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
    caption: '',
  });

  const headings: TocHeading[] = useMemo(() => {
    return extractHeadings(article.content);
  }, [article.content]);

  // Series Next/Prev articles
  const seriesArticles = useMemo(() => {
    if (!article.series) return [];
    return allArticles
      .filter(a => a.series?.id === article.series?.id)
      .sort((a, b) => (a.series?.stepNumber || 0) - (b.series?.stepNumber || 0));
  }, [article.series, allArticles]);

  const nextArticleInSeries = useMemo(() => {
    if (!article.series) return null;
    const currentStep = article.series.stepNumber;
    return seriesArticles.find(a => (a.series?.stepNumber || 0) === currentStep + 1) || null;
  }, [article.series, seriesArticles]);

  const prevArticleInSeries = useMemo(() => {
    if (!article.series) return null;
    const currentStep = article.series.stepNumber;
    return seriesArticles.find(a => (a.series?.stepNumber || 0) === currentStep - 1) || null;
  }, [article.series, seriesArticles]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Font size CSS style mapping for dynamic text scale across all paragraphs & elements
  const fontSizeStyle = useMemo(() => {
    switch (fontSize) {
      case 'sm':
        return { fontSize: '0.92rem', lineHeight: '1.74' };
      case 'lg':
        return { fontSize: '1.26rem', lineHeight: '1.92' };
      case 'base':
      default:
        return { fontSize: '1.08rem', lineHeight: '1.82' };
    }
  }, [fontSize]);

  if (viewMode === 'pdf') {
    return (
      <IeeePdfViewer
        article={article}
        onSwitchToWeb={() => setViewMode('web')}
      />
    );
  }

  return (
    <article className="min-h-screen bg-paper-100 dark:bg-paper-900 text-ink-900 dark:text-paper-100 font-sans pb-36 relative bg-tactical-grid transition-colors duration-150">
      {/* Lightbox Modal */}
      <MediaLightbox
        isOpen={lightbox.isOpen}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        caption={lightbox.caption}
        telemetry="LENS Optical View · 640x512 VOx Telemetry"
      />

      {/* Floating Reader Dock (Linear Glassmorphism Bar) */}
      <FloatingReaderDock
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        fontSize={fontSize}
        onChangeFontSize={handleFontSizeChange}
        zenMode={zenMode || isFullscreen}
        onToggleZenMode={handleToggleFullscreen}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        headings={headings}
      />

      {/* Top Editorial Breadcrumb Bar (Hidden in Fullscreen / Zen Mode) */}
      {!(zenMode || isFullscreen) && (
        <nav className="border-b border-paper-300/80 dark:border-paper-800/80 bg-paper-50/80 dark:bg-paper-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5 transition-all">
          <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between text-xs font-mono">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-ink-500 dark:text-ink-400">
              <button
                onClick={onBackToArchive}
                className="hover:text-ink-950 dark:hover:text-paper-100 transition-colors flex items-center gap-1 font-semibold group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Arşiv</span>
              </button>
              <ChevronRight className="w-3 h-3 opacity-40" />
              <span className="text-tactical-blue dark:text-tactical-blueLight font-medium">
                {article.category}
              </span>
              <ChevronRight className="w-3 h-3 opacity-40 hidden md:inline" />
              <span className="hidden md:inline truncate max-w-xs text-ink-400">
                {article.slug}
              </span>
            </div>

            {/* Quick Share Pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-700 transition-colors"
                title="Makale Bağlantısını Kopyala"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-tactical-emerald" />
                    <span className="text-tactical-emerald font-medium">Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3 text-ink-500" />
                    <span>Paylaş</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Reading Container - Expansive Widescreen Editorial Canvas */}
      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10">
        {/* TACTICAL HERO HUD & MISSION TITLE SECTION */}
        <ArticleHeroHud
          article={article}
          onShare={handleCopyLink}
          copiedLink={copiedLink}
        />

        {/* Layout Grid: Fluid Widescreen Prose Canvas + Sticky TOC Radar */}
        <div className={`flex flex-col xl:flex-row items-start justify-between gap-8 lg:gap-14 w-full ${(zenMode || isFullscreen) ? 'xl:ml-0' : ''}`}>
          
          {/* Main Prose Content Column (Expansive Engineering Canvas with Dynamic Font Scaling) */}
          <div 
            className="flex-1 min-w-0 w-full transition-all duration-200"
            style={fontSizeStyle}
          >
            
            {/* Abstract Callout (Refined Reticle Box) */}
            {article.abstract && article.abstract.trim() && article.abstract !== 'Özet metni...' && (
              <div className="reticle-box-blue p-6 sm:p-7 mb-12 rounded-lg border border-tactical-blue/20 dark:border-tactical-blue/30 bg-white/70 dark:bg-paper-850/80 backdrop-blur-sm shadow-paper-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-200 dark:border-paper-800 text-xs font-mono">
                  <div className="flex items-center gap-2 text-tactical-blue font-bold tracking-wider uppercase">
                    <ShieldCheck className="w-4 h-4 text-tactical-blue" />
                    <span>ARAŞTIRMA ÖZETİ (EXECUTIVE ABSTRACT)</span>
                  </div>
                  <span className="text-[11px] text-ink-400 font-mono">LENS PEER REVIEWED</span>
                </div>

                <p className="font-serif leading-relaxed text-ink-800 dark:text-paper-200 text-justify">
                  {article.abstract}
                </p>

                {article.keywords && article.keywords.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-paper-200 dark:border-paper-800/80 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    <span className="text-ink-400 text-[11px] mr-1">İNDEKS TERİMLERİ:</span>
                    {article.keywords.map((kw, kwIdx) => (
                      <span
                        key={kwIdx}
                        className="px-2 py-0.5 rounded bg-paper-150 dark:bg-paper-800 border border-paper-300 dark:border-paper-700/80 text-ink-700 dark:text-paper-300 text-[11px]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Before/After Interactive Comparison (Thermal Reticle Frame) */}
            {article.beforeAfterMedia?.beforeUrl && article.beforeAfterMedia?.afterUrl && (
              <BeforeAfterSlider
                media={article.beforeAfterMedia}
                onOpenLightbox={(url, title, caption) =>
                  setLightbox({
                    isOpen: true,
                    imageUrl: url,
                    title,
                    caption,
                  })
                }
              />
            )}

            {/* Rich Markdown Content Engine */}
            <MarkdownContent
              content={article.content}
              enableDropCap={true}
              articleTitle={article.title}
              articleDek={article.dek}
            />

            {/* Interactive Benchmark Tables (if present) */}
            {article.tables &&
              article.tables.map(tbl => (
                <InteractiveTable key={tbl.id} data={tbl} />
              ))}

            {/* Series Phase Navigation Deck */}
            {article.series && (
              <div className="reticle-box my-16 p-6 sm:p-7 rounded-lg border border-paper-300 dark:border-paper-800 bg-white/70 dark:bg-paper-850/80 shadow-paper-md">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-paper-200 dark:border-paper-800 text-xs font-mono">
                  <div className="flex items-center gap-2 text-tactical-blue font-semibold">
                    <GitBranch className="w-4 h-4 text-tactical-blue" />
                    <span>DİZİ NAVİGASYONU: {article.series.name}</span>
                  </div>
                  <span className="text-[11px] text-tactical-amber font-mono">
                    AŞAMA {article.series.stepNumber} / {article.series.totalSteps}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prevArticleInSeries ? (
                    <button
                      onClick={() => onSelectArticle(prevArticleInSeries)}
                      className="p-4 text-left rounded-lg bg-paper-100 dark:bg-paper-800/60 border border-paper-300 dark:border-paper-700 hover:border-tactical-blue transition-colors group"
                    >
                      <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wider mb-1">
                        ← ÖNCEKİ AŞAMA
                      </div>
                      <div className="font-serif font-semibold text-sm group-hover:text-tactical-blue dark:group-hover:text-tactical-blueLight transition-colors">
                        {prevArticleInSeries.title}
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-paper-300 dark:border-paper-800 text-[11px] font-mono text-ink-400 flex items-center justify-center">
                      Başlangıç Aşaması
                    </div>
                  )}

                  {nextArticleInSeries ? (
                    <button
                      onClick={() => onSelectArticle(nextArticleInSeries)}
                      className="p-4 text-left rounded-lg bg-paper-100 dark:bg-paper-800/60 border border-paper-300 dark:border-paper-700 hover:border-tactical-blue transition-colors group"
                    >
                      <div className="text-[10px] font-mono text-tactical-blue dark:text-tactical-blueLight font-semibold uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>SONRAKİ AŞAMA →</span>
                        <span>{nextArticleInSeries.series?.phase}</span>
                      </div>
                      <div className="font-serif font-semibold text-sm group-hover:text-tactical-blue dark:group-hover:text-tactical-blueLight transition-colors">
                        {nextArticleInSeries.title}
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-paper-300 dark:border-paper-800 text-[11px] font-mono text-ink-400 flex items-center justify-center">
                      Serinin Son Aşaması
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Tactical Sticky TOC Radar (Right Sidebar - Hidden in Fullscreen / Zen Mode) */}
          {!(zenMode || isFullscreen) && (
            <StickyToc headings={headings} />
          )}
        </div>
      </main>
    </article>
  );
};
