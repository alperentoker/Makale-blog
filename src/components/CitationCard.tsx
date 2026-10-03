import React, { useState } from 'react';
import { Copy, Check, Download, BookOpen, ExternalLink } from 'lucide-react';
import { Article } from '../types';
import { generateBibtex, generateIeeeCitation, generateApaCitation } from '../lib/citation';

interface CitationCardProps {
  article: Article;
}

export const CitationCard: React.FC<CitationCardProps> = ({ article }) => {
  const [activeTab, setActiveTab] = useState<'bibtex' | 'ieee' | 'apa'>('bibtex');
  const [copied, setCopied] = useState(false);

  const bibtexCode = article.bibtex || generateBibtex(article);
  const ieeeCitation = generateIeeeCitation(article);
  const apaCitation = generateApaCitation(article);

  const getCurrentText = () => {
    switch (activeTab) {
      case 'bibtex':
        return bibtexCode;
      case 'ieee':
        return ieeeCitation;
      case 'apa':
        return apaCitation;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const downloadBibtexFile = () => {
    const blob = new Blob([bibtexCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${article.slug}.bib`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-12 rounded border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 shadow-paper overflow-hidden">
      {/* Top Banner */}
      <div className="px-5 py-4 border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-tactical-800 dark:text-tactical-400" />
          <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans">
            Bu Çalışmayı Alıntıla (Cite This Work)
          </h3>
        </div>

        {/* DOI Pill */}
        {article.doi && (
          <a
            href={`https://doi.org/${article.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-200 hover:text-tactical-800 dark:hover:text-tactical-400 transition-colors"
          >
            <span>DOI: {article.doi}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1 border-b border-paper-200 dark:border-paper-800/60 bg-paper-100/50 dark:bg-paper-900/40">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('bibtex')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t transition-all ${
              activeTab === 'bibtex'
                ? 'bg-paper-50 dark:bg-paper-850 text-tactical-800 dark:text-tactical-400 border-b-2 border-tactical-800 dark:border-tactical-400 font-semibold'
                : 'text-ink-500 hover:text-ink-800 dark:hover:text-paper-200'
            }`}
          >
            BibTeX
          </button>
          <button
            onClick={() => setActiveTab('ieee')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t transition-all ${
              activeTab === 'ieee'
                ? 'bg-paper-50 dark:bg-paper-850 text-tactical-800 dark:text-tactical-400 border-b-2 border-tactical-800 dark:border-tactical-400 font-semibold'
                : 'text-ink-500 hover:text-ink-800 dark:hover:text-paper-200'
            }`}
          >
            IEEE Formatı
          </button>
          <button
            onClick={() => setActiveTab('apa')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t transition-all ${
              activeTab === 'apa'
                ? 'bg-paper-50 dark:bg-paper-850 text-tactical-800 dark:text-tactical-400 border-b-2 border-tactical-800 dark:border-tactical-400 font-semibold'
                : 'text-ink-500 hover:text-ink-800 dark:hover:text-paper-200'
            }`}
          >
            APA 7th
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
              copied
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Metni Kopyala</span>
              </>
            )}
          </button>

          {activeTab === 'bibtex' && (
            <button
              onClick={downloadBibtexFile}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-ink-700 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-paper-700 transition-colors"
              title=".bib Dosyası Olarak İndir"
            >
              <Download className="w-3.5 h-3.5 text-tactical-amber" />
              <span>.bib İndir</span>
            </button>
          )}
        </div>
      </div>

      {/* Snippet Area */}
      <div className="p-4 bg-paper-100 dark:bg-paper-900/90 font-mono text-xs overflow-x-auto">
        <pre className="text-ink-800 dark:text-ink-200 leading-relaxed whitespace-pre-wrap selection:bg-tactical-800 selection:text-white">
          {getCurrentText()}
        </pre>
      </div>
    </div>
  );
};
