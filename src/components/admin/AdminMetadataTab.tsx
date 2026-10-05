import React, { useState } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Sparkles 
} from 'lucide-react';
import { Article, Author } from '../../types';
import { slugify, estimateReadingTime } from '../../lib/parser';

interface AdminMetadataTabProps {
  draft: Article;
  setDraft: React.Dispatch<React.SetStateAction<Article>>;
  onSave: () => void;
  generateBibTeX: (art: Article) => string;
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

export const AdminMetadataTab: React.FC<AdminMetadataTabProps> = ({
  draft,
  setDraft,
  onSave,
  generateBibTeX,
}) => {
  const [newTagInput, setNewTagInput] = useState('');

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!draft.tags.includes(trimmed)) {
      setDraft({ ...draft, tags: [...draft.tags, trimmed] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDraft({ ...draft, tags: draft.tags.filter(t => t !== tagToRemove) });
  };

  const handleAddAuthor = () => {
    const newAuthor: Author = {
      name: '',
      affiliation: 'Yapay Zeka & Bilgisayarlı Görü',
      role: 'Yazar',
    };
    setDraft({ ...draft, authors: [...draft.authors, newAuthor] });
  };

  const handleUpdateAuthor = (index: number, field: keyof Author, value: string) => {
    const updated = [...draft.authors];
    updated[index] = { ...updated[index], [field]: value };
    setDraft({ ...draft, authors: updated });
  };

  const handleRemoveAuthor = (index: number) => {
    if (draft.authors.length <= 1) return;
    setDraft({ ...draft, authors: draft.authors.filter((_, idx) => idx !== index) });
  };

  return (
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
          onClick={onSave}
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
  );
};
