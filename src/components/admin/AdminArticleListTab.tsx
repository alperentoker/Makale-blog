import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Copy, 
  Trash2 
} from 'lucide-react';
import { Article } from '../../types';

interface AdminArticleListTabProps {
  articles: Article[];
  draft: Article;
  onSelectArticle: (article: Article) => void;
  onCreateNewArticle: () => void;
  onPreviewArticle: (article: Article) => void;
  onDuplicateArticle: (article: Article) => void;
  onDeleteArticleWithConfirm: (article: Article) => void;
  onOpenEditor: () => void;
}

export const AdminArticleListTab: React.FC<AdminArticleListTabProps> = ({
  articles,
  draft,
  onSelectArticle,
  onCreateNewArticle,
  onPreviewArticle,
  onDuplicateArticle,
  onDeleteArticleWithConfirm,
  onOpenEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const lower = searchQuery.toLowerCase();
    return articles.filter(
      a =>
        a.title.toLowerCase().includes(lower) ||
        a.category.toLowerCase().includes(lower) ||
        a.tags.some(t => t.toLowerCase().includes(lower))
    );
  }, [articles, searchQuery]);

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50">
            Kayıtlı Araştırma Makaleleri ({articles.length})
          </h2>
          <p className="text-xs text-ink-500 font-sans mt-1">
            Yayın durumunu kontrol edin, kopyalayın, düzenleyin veya yeni makale taslağı oluşturun.
          </p>
        </div>

        <button
          onClick={onCreateNewArticle}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs font-medium shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Makale Oluştur</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Başlık, kategori veya etikete göre ara..."
          className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800 text-ink-900 dark:text-paper-100 placeholder:text-ink-400"
        />
      </div>

      {filteredArticles.length === 0 ? (
        <div className="py-16 text-center rounded border border-dashed border-paper-300 dark:border-paper-800 p-8">
          <p className="text-sm font-serif italic text-ink-600 dark:text-paper-400 mb-4">
            {searchQuery ? 'Aramanıza uygun makale bulunamadı.' : 'Sistemde henüz kayıtlı bir makale bulunmuyor.'}
          </p>
          <button
            onClick={onCreateNewArticle}
            className="px-4 py-2 rounded bg-tactical-800 text-white font-mono text-xs"
          >
            İlk Makalenizi Yazın
          </button>
        </div>
      ) : (
        <div className="rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 overflow-hidden shadow-paper">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-900 font-mono text-ink-500">
                <th className="py-3 px-4 font-medium">Makale Başlığı</th>
                <th className="py-3 px-4 font-medium">Kategori</th>
                <th className="py-3 px-4 font-medium">Yayın Durumu</th>
                <th className="py-3 px-4 font-medium">Versiyon</th>
                <th className="py-3 px-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 dark:divide-paper-800 font-sans">
              {filteredArticles.map(art => (
                <tr
                  key={art.id}
                  className={`hover:bg-paper-100 dark:hover:bg-paper-800/40 transition-colors ${
                    art.id === draft.id ? 'bg-tactical-50/60 dark:bg-tactical-950/40' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-serif font-semibold text-ink-900 dark:text-paper-100 max-w-md">
                    <div className="flex items-center gap-2">
                      <span>{art.title}</span>
                      {art.id === draft.id && (
                        <span className="px-1.5 py-0.2 rounded bg-tactical-100 dark:bg-tactical-900/60 text-tactical-800 dark:text-tactical-300 text-[10px] font-mono">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-sans font-normal text-ink-500 truncate mt-0.5">
                      {art.dek}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-600 dark:text-ink-300">
                    {art.category}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono ${
                        art.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                          : art.status === 'under_review'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                          : 'bg-paper-200 text-ink-600 dark:bg-paper-700 dark:text-paper-300'
                      }`}
                    >
                      {art.status === 'published'
                        ? 'Yayında'
                        : art.status === 'under_review'
                        ? 'İncelemede'
                        : 'Taslak'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-500 text-[11px]">
                    {art.version}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          onSelectArticle(art);
                          onOpenEditor();
                        }}
                        className="px-2.5 py-1 text-xs font-mono rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 text-ink-700 dark:text-paper-200"
                        title="Canlı Düzenleyicide Aç"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => onPreviewArticle(art)}
                        className="p-1 text-ink-400 hover:text-tactical-800 dark:hover:text-tactical-400 transition-colors"
                        title="Okuyucu Modunda Önizle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateArticle(art)}
                        className="p-1 text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors"
                        title="Kopyasını Oluştur (Klonla)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteArticleWithConfirm(art)}
                        className="p-1 text-ink-400 hover:text-red-600 transition-colors"
                        title="Kalıcı Olarak Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
