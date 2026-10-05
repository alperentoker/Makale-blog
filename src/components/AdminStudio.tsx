import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileEdit, 
  UploadCloud, 
  Eye, 
  Save, 
  Maximize2, 
  Minimize2, 
  X, 
  Layers, 
  LogOut, 
  Settings, 
  Check, 
  Sliders 
} from 'lucide-react';
import { Article } from '../types';
import { estimateReadingTime } from '../lib/parser';
import { fetchArticle } from '../lib/api';

// Subcomponents for AdminStudio
import { AdminEditorTab } from './admin/AdminEditorTab';
import { AdminArticleListTab } from './admin/AdminArticleListTab';
import { AdminMetadataTab } from './admin/AdminMetadataTab';
import { AdminIngestionTab } from './admin/AdminIngestionTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';

interface AdminStudioProps {
  articles: Article[];
  onSaveArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  onClose: () => void;
  onPreviewArticle: (article: Article) => void;
  onLogout: () => void;
  onImportArticles?: (newArticles: Article[]) => void;
  onSeedDemoData?: () => void;
  onWipeAllArticles?: () => void;
}

const createBlankDraft = (): Article => ({
  id: `art-${Date.now()}`,
  slug: `yeni-makale-${Date.now().toString().slice(-4)}`,
  title: 'Yeni Araştırma Makalesi Başlığı',
  dek: 'Bir cümlelik editoryal tez ve araştırma hipotezi buraya yazılacaktır.',
  abstract: 'Bu çalışmada savunma sanayii ve kenar yapay zeka alanında yürütülen deneysel bulgular sunulmaktadır.',
  authors: [
    {
      name: 'Alperen Toker',
      affiliation: 'Yapay Zeka & Bilgisayarlı Görü',
      role: 'Yazar',
    }
  ],
  date: new Date().toISOString().split('T')[0],
  displayDate: 'Bugün',
  readingTime: '5 dk okuma süresi',
  version: 'v1.0 - İlk Sürüm',
  category: 'Kenar Yapay Zeka',
  tags: ['Savunma Sanayii', 'Bilgisayarlı Görü', 'Benchmark'],
  status: 'draft',
  content: `## 1. Giriş ve Problem Tanımı\n\nBuraya araştırmanın giriş metnini yazabilirsiniz. Formül eklemek için KaTeX kullanabilirsiniz: $E = mc^2$.\n\n> [!NOTE]\n> Bu bir editoryal not kutusudur.\n\n## 2. Metodoloji ve Formülasyon\n\n$$\\mathcal{L}_{\\text{loss}} = \\lambda_1 \\mathcal{L}_{\\text{IoU}} + \\lambda_2 \\mathcal{L}_{\\text{thermal}}$$\n\n## 3. Deneysel Bulgular\n\nSonuçlar ve saha testleri...`,
  bibtex: '',
  doi: '',
});

const generateBibTeX = (art: Article): string => {
  const year = art.date ? new Date(art.date).getFullYear() : 2026;
  const authorNames = art.authors && art.authors.length > 0
    ? art.authors.map(a => a.name).join(' and ')
    : 'Alperen Toker';
  const cleanKey = (art.slug || 'lens_article').replace(/-/g, '_');
  const doiField = art.doi ? `\n  doi       = {${art.doi}},` : '';
  return `@article{${cleanKey}_${year},
  author    = {${authorNames}},
  title     = {${art.title}},
  journal   = {LENS: Savunma Sanayii ve Yapay Zeka Arşivi},
  year      = {${year}},
  volume    = {1},${doiField}
  url       = {https://lens.alperentoker.com/#article/${art.slug || art.id}}
}`;
};

export const AdminStudio: React.FC<AdminStudioProps> = ({
  articles,
  onSaveArticle,
  onDeleteArticle,
  onClose,
  onPreviewArticle,
  onLogout,
  onImportArticles,
  onSeedDemoData,
  onWipeAllArticles,
}) => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(() => {
    return articles[0]?.id || '';
  });
  const [activeTab, setActiveTab] = useState<'editor' | 'posts' | 'meta' | 'ingestion' | 'settings'>('editor');
  const [zenMode, setZenMode] = useState<boolean>(false);

  // Editor Draft State
  const [draft, setDraft] = useState<Article>(() => {
    return articles.find(a => a.id === selectedArticleId) || articles[0] || createBlankDraft();
  });

  // Save feedback state
  const [isRecentlySaved, setIsRecentlySaved] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3000);
  };

  const handleSelectArticle = async (article: Article) => {
    setSelectedArticleId(article.id);
    if (!article.content || !article.content.trim()) {
      try {
        const full = await fetchArticle(article.id);
        setDraft(full);
        return;
      } catch {
        // fallback
      }
    }
    setDraft(article);
  };

  const handleSwitchArticleById = (id: string) => {
    const target = articles.find(a => a.id === id);
    if (target) {
      handleSelectArticle(target);
    }
  };

  const handleCreateNewArticle = () => {
    const newArt = createBlankDraft();
    onSaveArticle(newArt);
    setSelectedArticleId(newArt.id);
    setDraft(newArt);
    setActiveTab('editor');
    showToast('Yeni taslak makale oluşturuldu ve yüklendi.', 'success');
  };

  const handleDuplicateArticle = (source: Article) => {
    const duplicated: Article = {
      ...source,
      id: `art-${Date.now()}`,
      slug: `${source.slug}-kopya-${Date.now().toString().slice(-4)}`,
      title: `${source.title} (Kopya)`,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      displayDate: 'Bugün',
      version: 'v1.0 - Taslak Kopya',
    };
    onSaveArticle(duplicated);
    setSelectedArticleId(duplicated.id);
    setDraft(duplicated);
    setActiveTab('editor');
    showToast(`"${source.title}" makalesi başarıyla kopyalandı.`, 'success');
  };

  const handleDeleteArticleWithConfirm = (art: Article) => {
    if (window.confirm(`"${art.title}" başlıklı makaleyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      onDeleteArticle(art.id);
      showToast('Makale başarıyla silindi.', 'info');
      if (draft.id === art.id) {
        const remaining = articles.filter(a => a.id !== art.id);
        if (remaining.length > 0) {
          handleSelectArticle(remaining[0]);
        } else {
          const fresh = createBlankDraft();
          onSaveArticle(fresh);
          setSelectedArticleId(fresh.id);
          setDraft(fresh);
        }
      }
    }
  };

  const handleSave = useCallback(() => {
    const calculatedReading = draft.readingTime || estimateReadingTime(draft.content);
    const updatedDraft: Article = {
      ...draft,
      readingTime: calculatedReading,
      bibtex: draft.bibtex || generateBibTeX(draft),
    };

    onSaveArticle(updatedDraft);
    setDraft(updatedDraft);
    setIsRecentlySaved(true);
    showToast('Makale başarıyla kaydedildi!', 'success');

    if (updatedDraft.status === 'published') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1E3A8A', '#D97706', '#10B981'],
      });
    }

    setTimeout(() => {
      setIsRecentlySaved(false);
    }, 2500);
  }, [draft, onSaveArticle]);

  // Keyboard shortcut: Ctrl + S or Cmd + S to save draft, Esc to exit zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, zenMode]);

  const exportAsMarkdown = () => {
    const frontmatter = `---
title: "${draft.title}"
dek: "${draft.dek || ''}"
abstract: "${draft.abstract || ''}"
date: "${draft.date}"
category: "${draft.category}"
tags: [${draft.tags.map(t => `"${t}"`).join(', ')}]
status: "${draft.status}"
version: "${draft.version}"
readingTime: "${draft.readingTime}"
---

`;
    const fullMd = frontmatter + draft.content;
    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.slug || 'makale'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Markdown dosyası indirildi.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-paper-100 dark:bg-paper-950 flex flex-col overflow-hidden">
      {/* Dynamic Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-paper-lg border flex items-center gap-2 font-mono text-xs ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-800'
                : 'bg-paper-800 text-paper-100 border-paper-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header / Control Bar */}
      {!zenMode && (
        <header className="no-print h-14 border-b border-paper-300 dark:border-paper-800 bg-paper-100 dark:bg-paper-900 px-4 flex items-center justify-between gap-4 shrink-0 shadow-paper-sm">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <span className="font-serif font-black text-xl text-tactical-800 dark:text-tactical-400">
              ¶
            </span>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider uppercase text-tactical-800 dark:text-tactical-400">
                LENS // YÖNETİM & YAYIN STÜDYOSU
              </div>
              <div className="text-[11px] font-sans text-ink-500">
                Savunma Sanayii & Yapay Zeka Editoryal Konsolu
              </div>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="flex items-center rounded border border-paper-300 dark:border-paper-700 bg-paper-200 dark:bg-paper-800 p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-paper-700 text-ink-900 dark:text-paper-100 font-semibold shadow-sm'
                  : 'text-ink-600 dark:text-ink-300 hover:text-ink-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5 inline mr-1" />
              Canlı Düzenleyici
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'posts'
                  ? 'bg-white dark:bg-paper-700 text-ink-900 dark:text-paper-100 font-semibold shadow-sm'
                  : 'text-ink-600 dark:text-ink-300 hover:text-ink-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1" />
              Makaleler ({articles.length})
            </button>
            <button
              onClick={() => setActiveTab('meta')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'meta'
                  ? 'bg-white dark:bg-paper-700 text-ink-900 dark:text-paper-100 font-semibold shadow-sm'
                  : 'text-ink-600 dark:text-ink-300 hover:text-ink-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 inline mr-1" />
              Meta & SEO
            </button>
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'ingestion'
                  ? 'bg-white dark:bg-paper-700 text-ink-900 dark:text-paper-100 font-semibold shadow-sm'
                  : 'text-ink-600 dark:text-ink-300 hover:text-ink-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 inline mr-1" />
              İçe Aktarma
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-paper-700 text-ink-900 dark:text-paper-100 font-semibold shadow-sm'
                  : 'text-ink-600 dark:text-ink-300 hover:text-ink-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 inline mr-1" />
              Güvenlik & Ayarlar
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZenMode(true)}
              className="p-1.5 rounded hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-600 dark:text-ink-300 transition-colors"
              title="Zen / Odaklanma Modu (Esc ile çıkış)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {articles.length > 0 && (
              <button
                onClick={() => onPreviewArticle(draft)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-800 dark:text-paper-200 transition-colors"
                title="Kaydedip Okuyucu Modunda Önizle"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Okuyucu Önizleme</span>
              </button>
            )}

            {/* SAVE BUTTON WITH DYNAMIC VISUAL CONFIRMATION */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded shadow-sm transition-all duration-150 ${
                isRecentlySaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-tactical-800 hover:bg-tactical-900 text-white'
              }`}
              title="Değişiklikleri Kaydet (Ctrl+S / Cmd+S)"
            >
              {isRecentlySaved ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Kaydedildi!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{draft.status === 'published' ? 'Yayını Güncelle' : 'Taslağı Kaydet'}</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded bg-red-600/10 hover:bg-red-600 hover:text-white text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 transition-colors ml-1"
              title="Oturumu Kapat ve Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Çıkış</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-paper-200 dark:hover:bg-paper-800 text-ink-500 hover:text-ink-900 transition-colors ml-1"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Zen Mode Exit Button */}
      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-ink-900 text-white shadow-lg hover:bg-ink-800 transition-colors text-xs font-mono flex items-center gap-1.5 px-3"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Zen Modundan Çık (Esc)</span>
        </button>
      )}

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: LIVE SPLIT-SCREEN EDITOR */}
        {activeTab === 'editor' && (
          <AdminEditorTab
            draft={draft}
            articles={articles}
            setDraft={setDraft}
            onSwitchArticleById={handleSwitchArticleById}
            onCreateNewArticle={handleCreateNewArticle}
            onOpenMetaTab={() => setActiveTab('meta')}
            onExportMarkdown={exportAsMarkdown}
          />
        )}

        {/* TAB 2: POSTS LIST */}
        {activeTab === 'posts' && (
          <AdminArticleListTab
            articles={articles}
            draft={draft}
            onSelectArticle={handleSelectArticle}
            onCreateNewArticle={handleCreateNewArticle}
            onPreviewArticle={onPreviewArticle}
            onDuplicateArticle={handleDuplicateArticle}
            onDeleteArticleWithConfirm={handleDeleteArticleWithConfirm}
            onOpenEditor={() => setActiveTab('editor')}
          />
        )}

        {/* TAB 3: META & SEO SETTINGS */}
        {activeTab === 'meta' && (
          <AdminMetadataTab
            draft={draft}
            setDraft={setDraft}
            onSave={handleSave}
            generateBibTeX={generateBibTeX}
          />
        )}

        {/* TAB 4: SMART INGESTION DROPZONE & DIRECT PASTE */}
        {activeTab === 'ingestion' && (
          <AdminIngestionTab
            onSaveArticle={onSaveArticle}
            onSelectArticle={handleSelectArticle}
            onOpenEditor={() => setActiveTab('editor')}
            showToast={showToast}
            generateBibTeX={generateBibTeX}
          />
        )}

        {/* TAB 5: SETTINGS & DATABASE MANAGEMENT */}
        {activeTab === 'settings' && (
          <AdminSettingsTab
            articles={articles}
            showToast={showToast}
            onImportArticles={onImportArticles}
            onSeedDemoData={onSeedDemoData}
            onWipeAllArticles={onWipeAllArticles}
          />
        )}
      </div>
    </div>
  );
};

export default AdminStudio;
