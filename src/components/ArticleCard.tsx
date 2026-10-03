import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  GitBranch, 
  Tag
} from 'lucide-react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      onClick={() => onSelect(article)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-2xl border border-paper-300 dark:border-paper-800 bg-white/75 dark:bg-paper-850/75 hover:bg-white dark:hover:bg-paper-850 hover:border-tactical-blue/50 dark:hover:border-tactical-blue/50 p-6 sm:p-8 shadow-tactical-card hover:shadow-tactical-card-hover transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm"
    >
      {/* 4 Optical Corner Reticle Accents (Tactical ┌ ┐ and └ ┘) */}
      <span 
        className={`absolute top-0 left-0 w-3.5 h-3.5 pointer-events-none transition-colors duration-200 border-t-2 border-l-2 ${
          isHovered ? 'border-tactical-blue dark:border-tactical-blue' : 'border-tactical-amber/50 dark:border-tactical-amber/40'
        }`} 
      />
      <span 
        className={`absolute top-0 right-0 w-3.5 h-3.5 pointer-events-none transition-colors duration-200 border-t-2 border-r-2 ${
          isHovered ? 'border-tactical-blue dark:border-tactical-blue' : 'border-tactical-amber/50 dark:border-tactical-amber/40'
        }`} 
      />
      <span 
        className={`absolute bottom-0 left-0 w-3.5 h-3.5 pointer-events-none transition-colors duration-200 border-b-2 border-l-2 ${
          isHovered ? 'border-tactical-blue dark:border-tactical-blue' : 'border-paper-300 dark:border-paper-700'
        }`} 
      />
      <span 
        className={`absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none transition-colors duration-200 border-b-2 border-r-2 ${
          isHovered ? 'border-tactical-blue dark:border-tactical-blue' : 'border-paper-300 dark:border-paper-700'
        }`} 
      />

      {/* Top subtle laser accent line on hover */}
      <div className="absolute top-0 left-4 right-4 h-[1.5px] bg-gradient-to-r from-transparent via-tactical-blue/0 to-transparent group-hover:via-tactical-blue/80 transition-all duration-300" />

      <div>
        {/* Meta Row: Category, Date, Reading Time, Version */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 text-xs sm:text-sm font-mono">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tactical-blue/10 dark:bg-tactical-blue/15 text-tactical-blue dark:text-blue-400 font-bold tracking-wider uppercase border border-tactical-blue/20">
              <span className="w-2 h-2 rounded-full bg-tactical-blue animate-pulse" />
              {article.category}
            </span>
            <span className="text-paper-300 dark:text-paper-700">·</span>
            <span className="flex items-center gap-1.5 text-ink-600 dark:text-paper-300 font-medium">
              <Calendar className="w-3.5 h-3.5 text-ink-400" />
              <span>{article.displayDate}</span>
            </span>
            <span className="text-paper-300 dark:text-paper-700">·</span>
            <span className="flex items-center gap-1.5 text-ink-500 dark:text-paper-400">
              <Clock className="w-3.5 h-3.5 text-tactical-amber" />
              <span>{article.readingTime}</span>
            </span>
          </div>

          {/* Version Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono bg-paper-200 dark:bg-paper-800 text-ink-700 dark:text-paper-200 border border-paper-300/70 dark:border-paper-700/70 font-semibold text-xs">
              <GitBranch className="w-3.5 h-3.5 text-ink-400" />
              <span>{article.version.split(' - ')[0] || article.version}</span>
            </span>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl md:text-3.5xl font-serif font-bold text-ink-950 dark:text-paper-50 group-hover:text-tactical-blue dark:group-hover:text-blue-400 transition-colors leading-snug tracking-tight mb-3">
          {article.title}
        </h2>

        {/* Dek (Editorial Hypothesis / Subtitle) */}
        <p className="text-base sm:text-lg font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed mb-6">
          {article.dek}
        </p>

        {/* Tags Row */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag className="w-3.5 h-3.5 text-ink-400" />
            {article.tags.map(tag => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-md bg-paper-150 dark:bg-paper-800 border border-paper-200 dark:border-paper-700/70 text-ink-600 dark:text-paper-300 font-mono text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Card Footer: Metadata & Read Action */}
        <div className="flex items-center justify-between text-sm pt-4 border-t border-paper-200 dark:border-paper-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-tactical-emerald" />
            <span className="font-medium text-xs font-mono text-ink-700 dark:text-paper-200">
              Açık Erişim
            </span>
            <span className="text-paper-300 dark:text-paper-700">·</span>
            <span className="text-xs text-ink-500 font-mono">
              {article.authors[0]?.affiliation || 'Yapay Zeka & Bilgisayarlı Görü'}
            </span>
          </div>

          {/* Action Button */}
          <span className="font-mono text-tactical-blue dark:text-blue-400 font-bold flex items-center gap-1.5 text-sm group-hover:translate-x-1 transition-transform select-none">
            <span>Raporu Oku</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </article>
  );
};
