import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  FileEdit, 
  UploadCloud, 
  Eye, 
  Save, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Trash2, 
  X, 
  Layers, 
  Download, 
  LogOut, 
  Settings, 
  Key, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Copy,
  FileText,
  Search,
  Tag,
  Sparkles,
  Check,
  ClipboardPaste,
  Sliders
} from 'lucide-react';
import { Article, PublicationStatus, Author } from '../types';
import { parsePdfFile } from '../lib/pdfParser';
import { extractFrontmatter, slugify, estimateReadingTime } from '../lib/parser';
import { MarkdownContent } from '../lib/markdownRenderer';
import { changeMasterPassword } from '../lib/auth';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { InteractiveTable } from './InteractiveTable';

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

const POPULAR_TAGS = [
  'Savunma Sanayii',
  'Termal Görüntüleme',
  'Edge AI',
  'YOLOv9',
  'Benchmark',
  'TensorRT',
  'Veri Mühendisliği',
  'LWIR',
  'Jetson Orin',
  'Kızılötesi'
];

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
  url       = {https://lens.alperentoker.com/article/${art.slug}}
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
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Editor Draft State
  const [draft, setDraft] = useState<Article>(() => {
    return articles.find(a => a.id === selectedArticleId) || articles[0] || createBlankDraft();
  });

  // Save feedback state
  const [isRecentlySaved, setIsRecentlySaved] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Posts list filter
  const [searchQuery, setSearchQuery] = useState('');

  // Meta Tab State
  const [newTagInput, setNewTagInput] = useState('');

  // Direct paste ingestion state
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3000);
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticleId(article.id);
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
          setSelectedArticleId(remaining[0].id);
          setDraft(remaining[0]);
        } else {
          const fresh = createBlankDraft();
          onSaveArticle(fresh);
          setSelectedArticleId(fresh.id);
          setDraft(fresh);
        }
      }
    }
  };

  const handleSave = React.useCallback(() => {
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

  // Smart File Ingestion
  const handleFileUpload = async (file: File) => {
    setIsIngesting(true);
    try {
      if (file.name.endsWith('.pdf')) {
        const parsed = await parsePdfFile(file);
        const newArt: Article = {
          id: `art-${Date.now()}`,
          slug: file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: parsed.title,
          dek: parsed.dek || 'İçe aktarılan savunma ve mühendislik belgesi.',
          abstract: parsed.abstract,
          authors: parsed.authors,
          date: parsed.date,
          displayDate: 'Bugün',
          readingTime: '8 dk okuma süresi',
          version: 'v1.0 - PDF İçe Aktarım',
          category: parsed.category,
          tags: parsed.tags,
          status: 'draft',
          content: parsed.content,
          bibtex: '',
        };
        newArt.bibtex = generateBibTeX(newArt);
        onSaveArticle(newArt);
        setSelectedArticleId(newArt.id);
        setDraft(newArt);
        setActiveTab('editor');
        showToast('PDF belgesi başarıyla ayrıştırıldı ve kaydedildi!', 'success');
      } else if (file.name.endsWith('.md') || file.name.endsWith('.mdx')) {
        const text = await file.text();
        const { frontmatter, body } = extractFrontmatter(text);
        const newArt: Article = {
          id: `art-${Date.now()}`,
          slug: (frontmatter.title || file.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: frontmatter.title || file.name.replace(/\.md$/, ''),
          dek: frontmatter.dek || '',
          abstract: frontmatter.abstract || '',
          authors: frontmatter.authors || [
            { name: 'Alperen Toker', affiliation: 'Yapay Zeka & Bilgisayarlı Görü', role: 'Yazar' }
          ],
          date: frontmatter.date || new Date().toISOString().split('T')[0],
          displayDate: 'Bugün',
          readingTime: estimateReadingTime(body),
          version: frontmatter.version || 'v1.0 - MD Aktarımı',
          category: frontmatter.category || 'Kenar Yapay Zeka',
          tags: frontmatter.tags || ['Nesne Tespiti', 'Savunma Sanayii', 'Benchmark'],
          status: frontmatter.status || 'published',
          content: body,
          bibtex: '',
          doi: frontmatter.doi,
        };
        newArt.bibtex = generateBibTeX(newArt);
        onSaveArticle(newArt);
        setSelectedArticleId(newArt.id);
        setDraft(newArt);
        setActiveTab('editor');
        showToast('Markdown belgesi başarıyla içe aktarıldı!', 'success');
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        const lines = text.split('\n');
        const title = lines[0]?.trim() || file.name.replace(/\.txt$/, '');
        const body = lines.slice(1).join('\n').trim();
        const newArt: Article = {
          id: `art-${Date.now()}`,
          slug: slugify(title),
          title: title,
          dek: 'Metin dosyasından içe aktarılan araştırma notu.',
          abstract: body.slice(0, 300) + '...',
          authors: [
            { name: 'Alperen Toker', affiliation: 'Yapay Zeka & Bilgisayarlı Görü', role: 'Yazar' }
          ],
          date: new Date().toISOString().split('T')[0],
          displayDate: 'Bugün',
          readingTime: estimateReadingTime(body),
          version: 'v1.0 - Metin Aktarımı',
          category: 'Kenar Yapay Zeka',
          tags: ['Savunma Sanayii', 'Notlar'],
          status: 'draft',
          content: body || 'İçerik buraya yazılacak...',
          bibtex: '',
        };
        newArt.bibtex = generateBibTeX(newArt);
        onSaveArticle(newArt);
        setSelectedArticleId(newArt.id);
        setDraft(newArt);
        setActiveTab('editor');
        showToast('Metin dosyası başarıyla içe aktarıldı!', 'success');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      showToast('Dosya işlenirken hata oluştu. Lütfen geçerli bir dosya yükleyin.', 'error');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleDirectPasteImport = () => {
    if (!pasteContent.trim()) {
      showToast('Lütfen içe aktarılacak metin veya Markdown girin.', 'error');
      return;
    }
    const { frontmatter, body } = extractFrontmatter(pasteContent);
    const finalTitle = pasteTitle.trim() || frontmatter.title || 'İçe Aktarılan Araştırma Notu';
    const newArt: Article = {
      id: `art-${Date.now()}`,
      slug: slugify(finalTitle),
      title: finalTitle,
      dek: frontmatter.dek || 'Doğrudan panodan aktarılan araştırma taslağı.',
      abstract: frontmatter.abstract || body.slice(0, 250) + '...',
      authors: frontmatter.authors || [
        { name: 'Alperen Toker', affiliation: 'Yapay Zeka & Bilgisayarlı Görü', role: 'Yazar' }
      ],
      date: frontmatter.date || new Date().toISOString().split('T')[0],
      displayDate: 'Bugün',
      readingTime: estimateReadingTime(body),
      version: frontmatter.version || 'v1.0 - Pano Aktarımı',
      category: frontmatter.category || 'Kenar Yapay Zeka',
      tags: frontmatter.tags || ['Savunma Sanayii', 'Benchmark'],
      status: frontmatter.status || 'draft',
      content: body,
      bibtex: '',
      doi: frontmatter.doi,
    };
    newArt.bibtex = generateBibTeX(newArt);
    onSaveArticle(newArt);
    setSelectedArticleId(newArt.id);
    setDraft(newArt);
    setPasteContent('');
    setPasteTitle('');
    setActiveTab('editor');
    showToast('Panodaki Markdown başarıyla makaleye dönüştürüldü!', 'success');
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('markdown-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.content.substring(start, end);
    const replacement = `${before}${selected || 'örnek'}${after}`;

    const newContent = draft.content.substring(0, start) + replacement + draft.content.substring(end);
    setDraft({ ...draft, content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected.length || 5));
    }, 10);
  };

  const exportAsMarkdown = () => {
    const frontmatter = `---
title: "${draft.title}"
dek: "${draft.dek}"
category: "${draft.category}"
date: "${draft.date}"
version: "${draft.version}"
status: "${draft.status}"
tags:
${draft.tags.map(t => `  - "${t}"`).join('\n')}
---

${draft.content}`;

    const blob = new Blob([frontmatter], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${draft.slug || 'makale'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Markdown dosyası indirildi.', 'info');
  };

  // Full Database JSON Backup Export
  const exportAllArticlesJson = () => {
    const dataStr = JSON.stringify(articles, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `lens_articles_backup_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${articles.length} adet makale JSON yedeği olarak indirildi.`, 'success');
  };

  // Full Database JSON Restore
  const handleRestoreJsonBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (window.confirm(`${parsed.length} adet makale içeren yedek bulundu. Mevcut liste bu yedekle değiştirilsin mi?`)) {
            if (onImportArticles) {
              onImportArticles(parsed);
              setSelectedArticleId(parsed[0].id);
              setDraft(parsed[0]);
              showToast('Tüm makaleler başarıyla geri yüklendi!', 'success');
            }
          }
        } else {
          showToast('Geçersiz JSON formatı: Makale listesi bulunamadı.', 'error');
        }
      } catch (err) {
        console.error('Failed to parse backup JSON:', err);
        showToast('JSON yedeği okunurken hata oluştu.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Yeni parolalar birbiriyle eşleşmiyor.' });
      return;
    }
    const result = await changeMasterPassword(currentPassword, newPassword);
    if (result.success) {
      setPasswordStatus({ type: 'success', message: result.message || 'Parola güncellendi.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Yönetici parolası güncellendi!', 'success');
    } else {
      setPasswordStatus({ type: 'error', message: result.message || 'Parola güncellenemedi.' });
    }
  };

  // Tag helper functions
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!draft.tags.includes(trimmed)) {
      setDraft({
        ...draft,
        tags: [...draft.tags, trimmed],
      });
      showToast(`"${trimmed}" etiketi eklendi.`, 'info');
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDraft({
      ...draft,
      tags: draft.tags.filter(t => t !== tagToRemove),
    });
  };

  // Author helpers
  const handleUpdateAuthor = (index: number, field: keyof Author, val: string) => {
    const nextAuthors = [...draft.authors];
    nextAuthors[index] = { ...nextAuthors[index], [field]: val };
    setDraft({ ...draft, authors: nextAuthors });
  };

  const handleAddAuthor = () => {
    setDraft({
      ...draft,
      authors: [
        ...draft.authors,
        { name: '', affiliation: 'Yapay Zeka & Bilgisayarlı Görü', role: 'Araştırmacı' }
      ]
    });
  };

  const handleRemoveAuthor = (index: number) => {
    if (draft.authors.length <= 1) {
      showToast('En az bir yazar bulunmalıdır.', 'error');
      return;
    }
    setDraft({
      ...draft,
      authors: draft.authors.filter((_, i) => i !== index)
    });
  };

  // Filtered articles for posts list tab
  const filteredArticles = articles.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.dek.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  // Calculate word count
  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const charCount = draft.content.length;

  return (
    <div className="fixed inset-0 z-50 bg-paper-100 dark:bg-paper-900 text-ink-900 dark:text-paper-100 flex flex-col overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-2.5 font-mono text-xs transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : toast.type === 'error'
              ? 'bg-red-950 text-red-100 border-red-700'
              : 'bg-paper-800 text-paper-100 border-paper-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-tactical-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Studio Header */}
      {!zenMode && (
        <header className="px-5 py-3 border-b border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded bg-tactical-800 text-white flex items-center justify-center font-serif font-bold text-sm">
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
          <div className="flex-1 flex flex-col md:flex-row h-full">
            {/* Left Pane: Markdown Source Editor */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-900">
              {/* Metadata Control Sub-bar */}
              <div className="px-4 py-2.5 border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-850 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                {/* Active Article Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-500 font-semibold">Makale:</span>
                  <select
                    value={draft.id}
                    onChange={e => handleSwitchArticleById(e.target.value)}
                    className="max-w-[220px] px-2 py-0.5 rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-xs font-mono font-medium text-ink-900 dark:text-paper-100 truncate focus:outline-none"
                    title="Düzenlenecek Makaleyi Seçin"
                  >
                    {articles.map(art => (
                      <option key={art.id} value={art.id}>
                        {art.status === 'published' ? '● ' : '○ '}
                        {art.title.slice(0, 32)}
                        {art.title.length > 32 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateNewArticle}
                    className="p-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-tactical-800 dark:text-tactical-400"
                    title="Yeni Makale Ekle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-500">Durum:</span>
                    <select
                      value={draft.status}
                      onChange={e => setDraft({ ...draft, status: e.target.value as PublicationStatus })}
                      className="px-2 py-0.5 rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-xs font-mono font-medium text-ink-900 dark:text-paper-100"
                    >
                      <option value="draft">Taslak (Draft)</option>
                      <option value="under_review">İncelemede (Under Review)</option>
                      <option value="published">Yayında (Published)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-500">Kategori:</span>
                    <select
                      value={draft.category}
                      onChange={e => setDraft({ ...draft, category: e.target.value as any })}
                      className="px-2 py-0.5 rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 text-xs font-mono text-ink-900 dark:text-paper-100"
                    >
                      <option value="Termal Görüntüleme">Termal Görüntüleme</option>
                      <option value="Veri Mühendisliği">Veri Mühendisliği</option>
                      <option value="Kenar Yapay Zeka">Kenar Yapay Zeka</option>
                      <option value="Edge AI">Edge AI</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setActiveTab('meta')}
                    className="flex items-center gap-1 text-[11px] text-ink-600 hover:text-tactical-800 dark:hover:text-tactical-400 font-mono"
                    title="Meta ve SEO Bilgilerini Düzenle"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Meta</span>
                  </button>

                  <button
                    onClick={exportAsMarkdown}
                    className="flex items-center gap-1 text-[11px] text-ink-600 hover:text-tactical-800 dark:hover:text-tactical-400"
                    title="Markdown Dosyası Olarak İndir"
                  >
                    <Download className="w-3 h-3" />
                    <span>.md</span>
                  </button>
                </div>
              </div>

              {/* Quick Syntax Toolbar */}
              <div className="px-4 py-1.5 border-b border-paper-300 dark:border-paper-800 bg-paper-100 dark:bg-paper-850/50 flex items-center gap-1 overflow-x-auto text-xs font-mono">
                <button
                  onClick={() => insertText('## ')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-300 font-semibold"
                  title="Başlık H2"
                >
                  H2
                </button>
                <button
                  onClick={() => insertText('### ')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-300 font-semibold"
                  title="Alt Başlık H3"
                >
                  H3
                </button>
                <button
                  onClick={() => insertText('**', '**')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-300 font-bold"
                  title="Kalın Metin"
                >
                  B
                </button>
                <button
                  onClick={() => insertText('*', '*')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-300 italic"
                  title="İtalik Metin"
                >
                  I
                </button>
                <span className="w-[1px] h-4 bg-paper-300 dark:bg-paper-700 mx-1" />
                <button
                  onClick={() => insertText('$', '$')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-tactical-800 dark:text-tactical-400 font-mono font-bold"
                  title="KaTeX Satır İçi Formül: $x^2$"
                >
                  $f(x)$
                </button>
                <button
                  onClick={() => insertText('$$\n', '\n$$')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-tactical-800 dark:text-tactical-400 font-mono font-bold"
                  title="KaTeX Blok Formül"
                >
                  $$Blok$$
                </button>
                <span className="w-[1px] h-4 bg-paper-300 dark:bg-paper-700 mx-1" />
                <button
                  onClick={() => insertText('> [!NOTE]\n> ')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-blue-700 dark:text-blue-400"
                  title="Not Kutusu"
                >
                  [!Note]
                </button>
                <button
                  onClick={() => insertText('> [!WARNING]\n> ')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-red-700 dark:text-red-400"
                  title="Uyarı Kutusu"
                >
                  [!Uyarı]
                </button>
                <button
                  onClick={() => insertText('> [!INSIGHT]\n> ')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-amber-700 dark:text-amber-400"
                  title="Saha İncelemesi"
                >
                  [!Insight]
                </button>
                <button
                  onClick={() => insertText('```python\n# Savunma CV Kodu\n', '\n```')}
                  className="px-2 py-1 rounded hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-700 dark:text-paper-300"
                  title="Kod Bloğu"
                >
                  Kod
                </button>
              </div>

              {/* Title & Dek Inputs */}
              <div className="p-4 border-b border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-900/60 space-y-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Makale Başlığı..."
                  className="w-full text-lg font-serif font-bold bg-transparent border-b border-transparent focus:border-tactical-800 dark:focus:border-tactical-500 focus:outline-none text-ink-950 dark:text-paper-50 placeholder:text-ink-400"
                />
                <input
                  type="text"
                  value={draft.dek}
                  onChange={e => setDraft({ ...draft, dek: e.target.value })}
                  placeholder="Alt başlık (Dek) - 1 cümlelik tez..."
                  className="w-full text-xs font-serif italic bg-transparent border-b border-transparent focus:border-tactical-800 dark:focus:border-tactical-500 focus:outline-none text-ink-700 dark:text-paper-300 placeholder:text-ink-400"
                />
              </div>

              {/* Tags Quick Bar */}
              <div className="px-4 py-2 border-b border-paper-300 dark:border-paper-800 bg-paper-100 dark:bg-paper-850 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-ink-400 flex items-center gap-1 text-[11px]">
                  <Tag className="w-3 h-3" />
                  Etiketler:
                </span>
                {draft.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-paper-800 text-ink-700 dark:text-paper-300 border border-paper-300 dark:border-paper-700 text-[11px]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                    placeholder="+ Etiket ekle..."
                    className="w-24 px-1.5 py-0.5 text-[11px] rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:w-32 transition-all"
                  />
                  {newTagInput.trim() && (
                    <button
                      onClick={() => handleAddTag(newTagInput)}
                      className="px-1.5 py-0.5 rounded bg-tactical-800 text-white text-[10px]"
                    >
                      Ekle
                    </button>
                  )}
                </div>
              </div>

              {/* Markdown Textarea */}
              <div className="flex-1 p-4 overflow-y-auto">
                <textarea
                  id="markdown-editor-textarea"
                  value={draft.content}
                  onChange={e => {
                    const newContent = e.target.value;
                    let updated = { ...draft, content: newContent };
                    if (
                      (!draft.title || draft.title === 'Yeni Araştırma Makalesi Başlığı' || draft.title === 'Başlıksız Makale') &&
                      newContent.trim().startsWith('# ')
                    ) {
                      const lines = newContent.trim().split('\n');
                      const titleLine = lines[0].replace(/^#\s+/, '').trim();
                      updated.title = titleLine;
                      if (lines.length > 1 && lines[1].trim().startsWith('## ')) {
                        const dekLine = lines[1].trim().replace(/^##\s+/, '').replace(/^\((.*)\)$/, '$1').trim();
                        updated.dek = dekLine;
                      }
                    }
                    setDraft(updated);
                  }}
                  className="w-full h-full bg-transparent resize-none font-mono text-xs leading-relaxed text-ink-900 dark:text-paper-100 focus:outline-none"
                  placeholder="Markdown metnini buraya yazın..."
                  spellCheck={false}
                />
              </div>

              {/* Live Editor Status Bar */}
              <div className="px-4 py-2 border-t border-paper-300 dark:border-paper-800 bg-paper-100 dark:bg-paper-850 flex items-center justify-between text-[11px] font-mono text-ink-500">
                <div className="flex items-center gap-3">
                  <span>{wordCount.toLocaleString()} kelime</span>
                  <span>·</span>
                  <span>{charCount.toLocaleString()} karakter</span>
                  <span>·</span>
                  <span>{estimateReadingTime(draft.content)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Kısayol: <kbd className="px-1 py-0.5 rounded bg-white dark:bg-paper-700 border text-[10px]">Ctrl+S</kbd></span>
                </div>
              </div>
            </div>

            {/* Right Pane: Live Synced Editorial Preview */}
            <div className="w-full md:w-1/2 flex flex-col bg-paper-100 dark:bg-paper-950 overflow-y-auto p-6 sm:p-10">
              <div className="max-w-prose mx-auto w-full">
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-paper-300 dark:border-paper-800 text-[11px] font-mono text-ink-400 uppercase tracking-widest">
                  <span>CANLI EDİTORYAL ÖNİZLEME</span>
                  <span>{draft.readingTime || estimateReadingTime(draft.content)}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-paper-200 dark:bg-paper-800 text-ink-700 dark:text-paper-300">
                    {draft.category}
                  </span>
                  <span className="text-[11px] font-mono text-ink-500">
                    {draft.version}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-950 dark:text-paper-50 leading-snug tracking-tight mb-3">
                  {draft.title || 'Başlıksız Makale'}
                </h1>

                {draft.dek && (
                  <p className="text-base font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed mb-6">
                    {draft.dek}
                  </p>
                )}

                {draft.beforeAfterMedia && (
                  <BeforeAfterSlider media={draft.beforeAfterMedia} />
                )}

                <div className="text-sm">
                  <MarkdownContent
                    content={draft.content}
                    enableDropCap={false}
                    articleTitle={draft.title}
                    articleDek={draft.dek}
                  />
                </div>

                {draft.tables && draft.tables.map(tbl => (
                  <InteractiveTable key={tbl.id} data={tbl} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POSTS LIST */}
        {activeTab === 'posts' && (
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
                onClick={handleCreateNewArticle}
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
                  onClick={handleCreateNewArticle}
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
                                handleSelectArticle(art);
                                setActiveTab('editor');
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
                              onClick={() => handleDuplicateArticle(art)}
                              className="p-1 text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors"
                              title="Kopyasını Oluştur (Klonla)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticleWithConfirm(art)}
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
        )}

        {/* TAB 3: META & SEO SETTINGS (NEW!) */}
        {activeTab === 'meta' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-paper-300 dark:border-paper-800">
              <div>
                <h2 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50">
                  Meta, SEO & Akademik Referans Ayarları
                </h2>
                <p className="text-xs text-ink-500 font-sans mt-1">
                  Düzenlenen: <strong className="font-serif text-ink-800 dark:text-paper-200">"{draft.title}"</strong>
                </p>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs font-medium shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Değişiklikleri Kaydet</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Slug / URL identifier */}
              <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                  URL BAĞLANTI KİMLİĞİ (SLUG)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={e => setDraft({ ...draft, slug: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                  <button
                    onClick={() => setDraft({ ...draft, slug: slugify(draft.title) })}
                    className="px-3 py-1.5 rounded bg-paper-200 dark:bg-paper-700 hover:bg-paper-300 text-ink-700 dark:text-paper-200 font-mono text-xs"
                    title="Başlıktan otomatik üret"
                  >
                    Başlıktan Üret
                  </button>
                </div>
                <p className="text-[11px] text-ink-500 font-sans mt-1">
                  Örnek: <code className="font-mono">#article/{draft.slug}</code> şeklinde doğrudan bağlantı sağlar.
                </p>
              </div>

              {/* Abstract */}
              <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                  ARAŞTIRMA ÖZETİ (ABSTRACT)
                </label>
                <textarea
                  value={draft.abstract}
                  onChange={e => setDraft({ ...draft, abstract: e.target.value })}
                  rows={4}
                  placeholder="Makalenin akademik hipotezi ve metodolojik özeti..."
                  className="w-full px-3 py-2 text-xs font-sans leading-relaxed rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                />
                <p className="text-[11px] text-ink-500 font-sans mt-1">
                  Arşiv kartlarında ve okuyucu tepe panelinde editoryal özet olarak sunulur.
                </p>
              </div>

              {/* Tags & Taxonomy */}
              <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-2">
                  ETİKETLER & KATEGORİZASYON
                </label>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {draft.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-tactical-50 dark:bg-tactical-950/60 text-tactical-800 dark:text-tactical-300 border border-tactical-200 dark:border-tactical-800 font-mono text-xs"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 max-w-sm mb-3">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                    placeholder="Yeni etiket yazın..."
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                  <button
                    onClick={() => handleAddTag(newTagInput)}
                    className="px-3 py-1.5 rounded bg-tactical-800 text-white font-mono text-xs"
                  >
                    Ekle
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-ink-500 mr-2">Önerilen Etiketler:</span>
                  <div className="inline-flex flex-wrap gap-1 mt-1">
                    {POPULAR_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        disabled={draft.tags.includes(tag)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-paper-150 dark:bg-paper-800 text-ink-600 dark:text-paper-300 hover:bg-paper-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Authors List */}
              <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300">
                    YAZARLAR & KURUM BİLGİSİ
                  </label>
                  <button
                    onClick={handleAddAuthor}
                    className="text-xs font-mono text-tactical-800 dark:text-tactical-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yazar Ekle</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {draft.authors.map((author, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-center p-3 rounded bg-paper-100 dark:bg-paper-800/60 border border-paper-200 dark:border-paper-700/60">
                      <input
                        type="text"
                        value={author.name}
                        onChange={e => handleUpdateAuthor(idx, 'name', e.target.value)}
                        placeholder="Yazar Adı Soyadı"
                        className="flex-1 px-2.5 py-1 text-xs font-sans rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={author.affiliation}
                        onChange={e => handleUpdateAuthor(idx, 'affiliation', e.target.value)}
                        placeholder="Kurum / Departman"
                        className="flex-1 px-2.5 py-1 text-xs font-sans rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={author.role || ''}
                        onChange={e => handleUpdateAuthor(idx, 'role', e.target.value)}
                        placeholder="Rol (Yazar, Danışman)"
                        className="w-28 px-2.5 py-1 text-xs font-sans rounded bg-white dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none"
                      />
                      <button
                        onClick={() => handleRemoveAuthor(idx)}
                        className="p-1 text-ink-400 hover:text-red-500 transition-colors"
                        title="Yazarı Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Version & Reading Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                    VERSİYON ETİKETİ
                  </label>
                  <input
                    type="text"
                    value={draft.version}
                    onChange={e => setDraft({ ...draft, version: e.target.value })}
                    placeholder="v1.0 - İlk Sürüm"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>

                <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                    OKUMA SÜRESİ
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draft.readingTime}
                      onChange={e => setDraft({ ...draft, readingTime: e.target.value })}
                      placeholder="8 dk okuma süresi"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                    />
                    <button
                      onClick={() => setDraft({ ...draft, readingTime: estimateReadingTime(draft.content) })}
                      className="px-2.5 py-1.5 rounded bg-paper-200 dark:bg-paper-700 hover:bg-paper-300 text-ink-700 dark:text-paper-200 font-mono text-[11px]"
                      title="Kelime sayısından hesapla"
                    >
                      Hesapla
                    </button>
                  </div>
                </div>
              </div>

              {/* Date & DOI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                    YAYIN TARİHİ
                  </label>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={e => setDraft({ ...draft, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>

                <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">
                    AKADEMİK DOI NUMARASI
                  </label>
                  <input
                    type="text"
                    value={draft.doi || ''}
                    onChange={e => setDraft({ ...draft, doi: e.target.value })}
                    placeholder="Örn: 10.1109/... veya LENS-RR-2026-001 (Opsiyonel)"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>
              </div>

              {/* BibTeX Citation */}
              <div className="p-5 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-semibold text-ink-700 dark:text-paper-300">
                    BIBTEX AKADEMİK ATIF KODU
                  </label>
                  <button
                    onClick={() => setDraft({ ...draft, bibtex: generateBibTeX(draft) })}
                    className="text-xs font-mono text-tactical-800 dark:text-tactical-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Otomatik BibTeX Oluştur</span>
                  </button>
                </div>
                <textarea
                  value={draft.bibtex || generateBibTeX(draft)}
                  onChange={e => setDraft({ ...draft, bibtex: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 text-xs font-mono leading-relaxed rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SMART INGESTION DROPZONE & DIRECT PASTE */}
        {activeTab === 'ingestion' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50">
                Akıllı Belge İçe Aktarma Merkezi (Smart Ingestion)
              </h2>
              <p className="text-xs text-ink-500 font-sans mt-1">
                IEEE veya ArXiv formatındaki `.pdf`, `.md` veya `.txt` dosyalarınızı sürükleyin ya da doğrudan Markdown yapıştırın.
              </p>
            </div>

            {/* Ingestion Option A: File Dropzone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all mb-8 ${
                dragOver
                  ? 'border-tactical-800 bg-tactical-50/50 dark:bg-tactical-950/40'
                  : 'border-paper-300 dark:border-paper-700 hover:border-tactical-800 bg-white dark:bg-paper-850'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.mdx,.txt"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 rounded-full bg-tactical-50 dark:bg-tactical-950/60 text-tactical-800 dark:text-tactical-400 mx-auto flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h3 className="text-base font-serif font-semibold text-ink-900 dark:text-paper-100 mb-1">
                {isIngesting ? 'Belge Ayrıştırılıyor...' : 'Belgenizi buraya sürükleyin veya seçin'}
              </h3>
              <p className="text-xs text-ink-500 font-sans max-w-sm mx-auto mb-3">
                Desteklenen formatlar: <strong className="font-mono">.PDF</strong>, <strong className="font-mono">.MD / .MDX</strong> ve <strong className="font-mono">.TXT</strong>
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-tactical-800 text-white font-mono text-xs">
                <span>Dosya Gözat</span>
              </div>
            </div>

            {/* Ingestion Option B: Direct Markdown Paste */}
            <div className="p-6 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardPaste className="w-4 h-4 text-tactical-800 dark:text-tactical-400" />
                <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans">
                  Doğrudan Markdown veya Metin Yapıştır
                </h3>
              </div>
              <p className="text-xs text-ink-500 font-sans mb-3">
                Dosya kaydetmek zorunda kalmadan panodaki Markdown veya araştırma notunu yapıştırarak hemen yeni makale oluşturun.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={e => setPasteTitle(e.target.value)}
                  placeholder="Makale Başlığı (isteğe bağlı, boş bırakılırsa metinden çekilir)..."
                  className="w-full px-3 py-2 text-xs font-sans rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                />

                <textarea
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                  rows={8}
                  placeholder="Markdown içeriğini buraya yapıştırın (başlıklar, formüller ve notlar desteklenir)..."
                  className="w-full px-3 py-2 text-xs font-mono leading-relaxed rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none"
                />

                <button
                  onClick={handleDirectPasteImport}
                  className="px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs font-medium transition-colors flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Makaleyi Oluştur ve Düzenleyiciye Aktar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & DATABASE MANAGEMENT */}
        {activeTab === 'settings' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-ink-950 dark:text-paper-50">
                Güvenlik, Yedekleme & Sistem Ayarları
              </h2>
              <p className="text-xs text-ink-500 font-sans mt-1">
                Yönetici parolası güncellemesi, tam JSON veritabanı yedeği ve gizli erişim rotası.
              </p>
            </div>

            {/* Secret URL Info Box */}
            <div className="p-5 mb-8 rounded border border-tactical-200 dark:border-tactical-800 bg-tactical-50/60 dark:bg-tactical-950/40">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-tactical-800 dark:text-tactical-400 mb-1">
                <Key className="w-4 h-4" />
                <span>GİZLİ YÖNETİM ERİŞİM ROTASI & KISAYOLLAR</span>
              </div>
              <p className="text-xs text-ink-700 dark:text-paper-300 font-sans leading-relaxed mb-2">
                Platformda ana sayfada hiçbir admin butonu bulunmaz. Bu yönetim paneline girmek için URL sonuna doğrudan <code className="font-mono bg-white dark:bg-paper-800 px-1.5 py-0.5 rounded font-bold">/#admin</code> ekleyebilirsiniz. Ayrıca klavyeden <kbd className="font-mono bg-white dark:bg-paper-800 px-1.5 py-0.5 rounded text-[11px]">Alt+A</kbd> kısayolu ile açabilirsiniz.
              </p>
              <div className="text-[11px] font-mono text-tactical-700 dark:text-tactical-400">
                Varsayılan Master Parola: <strong>lens2026</strong>
              </div>
            </div>

            {/* Password Change Box */}
            <div className="p-6 mb-8 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
              <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-4">
                Yönetici Parolasını Güncelle
              </h3>

              {passwordStatus && (
                <div
                  className={`p-3 rounded text-xs flex items-center gap-2 mb-4 ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
                    MEVCUT PAROLA (veya lens2026)
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
                    YENİ PAROLA (EN AZ 6 KARAKTER)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink-600 dark:text-ink-400 mb-1">
                    YENİ PAROLA TEKRARI
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono rounded bg-paper-100 dark:bg-paper-800 border border-paper-300 dark:border-paper-700 focus:outline-none focus:ring-1 focus:ring-tactical-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs font-medium transition-colors"
                >
                  Parolayı Güncelle
                </button>
              </form>
            </div>

            {/* FULL DATABASE BACKUP & RESTORE */}
            <div className="p-6 mb-8 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
              <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-2">
                Veritabanı Yedekleme & Geri Yükleme (JSON)
              </h3>
              <p className="text-xs text-ink-500 font-sans mb-4">
                Tüm makaleleri tek dosya olarak bilgisayarınıza yedekleyebilir veya daha önce aldığınız bir yedeği sisteme aktarabilirsiniz.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={exportAllArticlesJson}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-tactical-800 hover:bg-tactical-900 text-white font-mono text-xs shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tüm Veritabanını İndir (.json Yedek)</span>
                </button>

                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleRestoreJsonBackup(e.target.files[0]);
                    }
                  }}
                />

                <button
                  onClick={() => backupInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 text-ink-800 dark:text-paper-200 border border-paper-300 dark:border-paper-700 font-mono text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Yedekten Geri Yükle (.json)</span>
                </button>
              </div>
            </div>

            {/* Demo Data / Wipe Options */}
            <div className="p-6 rounded border border-paper-300 dark:border-paper-800 bg-white dark:bg-paper-850 shadow-paper">
              <h3 className="text-sm font-semibold tracking-tight text-ink-900 dark:text-paper-100 font-sans mb-2">
                Sistem Veritabanı Sıfırlama
              </h3>
              <p className="text-xs text-ink-500 font-sans mb-4">
                İhtiyaç duyarsanız hazır benchmark yol haritası makalesini yeniden yükleyebilir veya tüm makaleleri temizleyebilirsiniz.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {onSeedDemoData && (
                  <button
                    onClick={() => {
                      if (confirm('Hazır akademik benchmark makalesi yüklensin mi?')) {
                        onSeedDemoData();
                        showToast('Örnek benchmark makalesi başarıyla yüklendi.', 'success');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-paper-150 dark:bg-paper-800 hover:bg-paper-200 text-ink-800 dark:text-paper-200 border border-paper-300 dark:border-paper-700 font-mono text-xs"
                  >
                    <Database className="w-3.5 h-3.5 text-tactical-800 dark:text-tactical-400" />
                    <span>Örnek Benchmark Makalesini Yükle</span>
                  </button>
                )}

                {onWipeAllArticles && articles.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('DİKKAT: TÜM makaleler silinecektir. Bu işlem geri alınamaz. Emin misiniz?')) {
                        onWipeAllArticles();
                        showToast('Tüm makaleler temizlendi.', 'info');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-mono text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tüm Makaleleri Sıfırla (Temizle)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStudio;
