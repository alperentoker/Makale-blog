import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  Tag, 
  Sliders 
} from 'lucide-react';
import { Article, PublicationStatus } from '../../types';
import { estimateReadingTime } from '../../lib/parser';
import { MarkdownContent } from '../../lib/markdownRenderer';
import { BeforeAfterSlider } from '../BeforeAfterSlider';
import { InteractiveTable } from '../InteractiveTable';

interface AdminEditorTabProps {
  draft: Article;
  articles: Article[];
  setDraft: React.Dispatch<React.SetStateAction<Article>>;
  onSwitchArticleById: (id: string) => void;
  onCreateNewArticle: () => void;
  onOpenMetaTab: () => void;
  onExportMarkdown: () => void;
}

export const AdminEditorTab: React.FC<AdminEditorTabProps> = ({
  draft,
  articles,
  setDraft,
  onSwitchArticleById,
  onCreateNewArticle,
  onOpenMetaTab,
  onExportMarkdown,
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

  const insertText = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('markdown-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.content.substring(start, end);
    const replacement = prefix + selected + suffix;
    const newContent = draft.content.substring(0, start) + replacement + draft.content.substring(end);

    setDraft({ ...draft, content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const charCount = draft.content.length;

  return (
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
              onChange={e => onSwitchArticleById(e.target.value)}
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
              onClick={onCreateNewArticle}
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
              onClick={onOpenMetaTab}
              className="flex items-center gap-1 text-[11px] text-ink-600 hover:text-tactical-800 dark:hover:text-tactical-400 font-mono"
              title="Meta ve SEO Bilgilerini Düzenle"
            >
              <Sliders className="w-3 h-3" />
              <span>Meta</span>
            </button>

            <button
              onClick={onExportMarkdown}
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

          {draft.beforeAfterMedia?.beforeUrl && draft.beforeAfterMedia?.afterUrl && (
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
  );
};
