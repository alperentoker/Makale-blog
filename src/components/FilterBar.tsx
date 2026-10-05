import React, { useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface FilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryCounts: Record<string, number>;
  filteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categoryCounts,
  filteredCount,
  totalCount,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="relative my-4 sm:my-5 max-w-[1720px] w-full mx-auto px-4 sm:px-8 lg:px-12">
      <div className="p-1.5 sm:p-2 rounded-xl border border-paper-300/80 dark:border-paper-800/80 bg-white/85 dark:bg-paper-850/85 backdrop-blur-md shadow-tactical-card flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
        
        {/* Left: Compact Pill Category Buttons with Subtle Borders */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-paper-150/70 dark:bg-paper-900/70 rounded-lg border border-paper-200/80 dark:border-paper-800/70 scrollbar-none">
          {categories.map(category => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] ?? 0;

            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-md text-xs font-mono transition-all duration-150 whitespace-nowrap select-none border ${
                  isSelected
                    ? 'bg-white dark:bg-paper-800 text-ink-950 dark:text-paper-50 font-semibold shadow-xs border-paper-300/90 dark:border-paper-700'
                    : 'text-ink-600 dark:text-ink-400 border-transparent hover:border-paper-300/60 dark:hover:border-paper-700/60 hover:text-ink-950 dark:hover:text-paper-200 hover:bg-white/60 dark:hover:bg-paper-800/50'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono transition-colors ${
                    isSelected
                      ? 'bg-tactical-blue/15 text-tactical-blue dark:text-blue-300 font-bold'
                      : 'bg-paper-200/80 dark:bg-paper-800/80 text-ink-500 dark:text-ink-400 font-medium'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Modern Compact Search Input in Visual Rhythm with Pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72 md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 dark:text-ink-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Başlık, etiket veya terim ara..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full h-[34px] pl-9 pr-11 py-1.5 text-xs bg-paper-150/70 dark:bg-paper-900/70 border border-paper-300/80 dark:border-paper-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-tactical-blue dark:focus:ring-tactical-blue focus:bg-white dark:focus:bg-paper-900 font-sans text-ink-950 dark:text-paper-50 placeholder:text-ink-400 transition-all"
            />

            {/* Clear button or Keyboard Shortcut hint */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className="p-1 rounded text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors"
                  title="Aramayı Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-ink-400 dark:text-ink-500 bg-white/80 dark:bg-paper-800/80 border border-paper-300/60 dark:border-paper-700/60 rounded">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter status strip (if active filtering) */}
      {(searchQuery.trim() || selectedCategory !== 'Tümü') && (
        <div className="mt-2 px-2 flex items-center justify-between text-xs font-mono text-ink-600 dark:text-ink-300">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-tactical-blue" />
            <span>Filtrelenen:</span>
            <span className="font-bold text-ink-900 dark:text-paper-100">
              {filteredCount} / {totalCount} Makale
            </span>
            {searchQuery && (
              <span className="text-tactical-amber font-semibold">
                (&ldquo;{searchQuery}&rdquo;)
              </span>
            )}
          </div>

          <button
            onClick={() => {
              onSelectCategory('Tümü');
              onSearchChange('');
            }}
            className="text-tactical-blue dark:text-blue-400 hover:underline font-mono text-xs font-semibold"
          >
            Filtreleri Sıfırla
          </button>
        </div>
      )}
    </section>
  );
};
