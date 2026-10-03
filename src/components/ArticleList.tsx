import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText,
  Layers,
  Crosshair
} from 'lucide-react';
import { Article } from '../types';
import { ArchiveHero } from './ArchiveHero';
import { ArticleCard } from './ArticleCard';
import { FilterBar } from './FilterBar';

interface ArticleListProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  onSelectArticle,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'Tümü';
  const searchQuery = searchParams.get('q') || '';

  const handleSelectCategory = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'Tümü') {
      next.delete('category');
    } else {
      next.set('category', cat);
    }
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (query: string) => {
    const next = new URLSearchParams(searchParams);
    if (!query.trim()) {
      next.delete('q');
    } else {
      next.set('q', query);
    }
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  // Dynamic categories based on articles present
  const categories = useMemo(() => {
    const baseCats = ['Tümü'];
    const articleCats = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));
    return [...baseCats, ...articleCats];
  }, [articles]);

  // Compute article count for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Tümü': articles.length
    };
    categories.forEach(cat => {
      if (cat !== 'Tümü') {
        counts[cat] = articles.filter(a => a.category === cat).length;
      }
    });
    return counts;
  }, [articles, categories]);

  // Filtered articles computation
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      // Category filter
      if (selectedCategory !== 'Tümü' && art.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(q);
        const matchesDek = art.dek.toLowerCase().includes(q);
        const matchesTags = art.tags.some(t => t.toLowerCase().includes(q));
        const matchesKeywords = art.keywords?.some(k => k.toLowerCase().includes(q)) ?? false;
        const matchesAuthor = art.authors.some(a => a.name.toLowerCase().includes(q));
        return matchesTitle || matchesDek || matchesTags || matchesAuthor || matchesKeywords;
      }
      return true;
    });
  }, [articles, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-paper-100 dark:bg-paper-900 text-ink-900 dark:text-paper-100 bg-tactical-grid pb-28 transition-colors duration-150">
      {/* Tactical Editorial Archive Hero */}
      <ArchiveHero
        publishedCount={articles.filter(a => a.status === 'published').length}
      />

      {/* Modern Tactical Segmented Filter and Search Bar */}
      {articles.length > 0 && (
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          categoryCounts={categoryCounts}
          filteredCount={filteredArticles.length}
          totalCount={articles.length}
        />
      )}

      {/* Article Grid List */}
      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12 mt-8">
        {articles.length === 0 ? (
          /* Empty Database State */
          <div className="reticle-box py-24 px-6 text-center rounded-2xl border border-dashed border-paper-300 dark:border-paper-800 bg-white/40 dark:bg-paper-850/40 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-paper-200 dark:bg-paper-800 text-ink-400 dark:text-ink-500 mx-auto flex items-center justify-center mb-4 border border-paper-300 dark:border-paper-700">
              <FileText className="w-7 h-7" />
            </div>
            <div className="font-mono text-sm text-tactical-blue uppercase tracking-widest mb-1.5 font-bold">
              ARŞİV DİZİNİ BOŞ
            </div>
            <h3 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50 mb-2">
              Henüz yayınlanmış bir araştırma notu bulunmuyor
            </h3>
            <p className="text-base font-serif italic text-ink-600 dark:text-paper-400 max-w-md mx-auto leading-relaxed">
              Bilgisayarlı görü ve yapay zeka modelleri üzerine yeni teknik raporlar yakında sisteme eklenecektir.
            </p>
          </div>
        ) : filteredArticles.length === 0 ? (
          /* No Search Match State */
          <div className="reticle-box py-20 px-6 text-center rounded-2xl border border-dashed border-paper-300 dark:border-paper-800 bg-white/40 dark:bg-paper-850/40">
            <Crosshair className="w-10 h-10 text-tactical-amber mx-auto mb-3 opacity-80" />
            <div className="font-mono text-sm font-bold text-tactical-amber uppercase tracking-wider mb-2">
              SONUÇ BULUNAMADI // 0 EŞLEŞME
            </div>
            <p className="text-base font-serif text-ink-700 dark:text-paper-300 mb-5">
              &ldquo;{searchQuery}&rdquo; arama sorgusuna ve seçili filtrelere uygun bir teknik makale bulunamadı.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-5 py-2 rounded-xl bg-tactical-blue text-white font-mono text-sm font-semibold hover:bg-tactical-blueDark transition-colors"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          /* Articles Feed */
          <div className="space-y-6">
            {/* Feed Section Header with count */}
            <div className="flex items-center justify-between pb-3 text-xs sm:text-sm font-mono text-ink-600 dark:text-ink-400 border-b border-paper-200 dark:border-paper-800/80">
              <span className="flex items-center gap-2 uppercase font-bold text-ink-900 dark:text-paper-100">
                <Layers className="w-4 h-4 text-tactical-blue" />
                <span>YAYINLANAN RAPORLAR ({filteredArticles.length})</span>
              </span>
              <span className="font-mono text-xs text-ink-400">
                KRONOLOJİK SIRALAMA
              </span>
            </div>

            {/* List of Tactical Article Cards */}
            {filteredArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onSelect={onSelectArticle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
