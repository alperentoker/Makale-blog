import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  ClipboardPaste, 
  FileText 
} from 'lucide-react';
import { Article } from '../../types';
import { parsePdfFile } from '../../lib/pdfParser';
import { extractFrontmatter, slugify, estimateReadingTime } from '../../lib/parser';

interface AdminIngestionTabProps {
  onSaveArticle: (article: Article) => void;
  onSelectArticle: (article: Article) => void;
  onOpenEditor: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  generateBibTeX: (art: Article) => string;
}

export const AdminIngestionTab: React.FC<AdminIngestionTabProps> = ({
  onSaveArticle,
  onSelectArticle,
  onOpenEditor,
  showToast,
  generateBibTeX,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        onSelectArticle(newArt);
        onOpenEditor();
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
        onSelectArticle(newArt);
        onOpenEditor();
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
        onSelectArticle(newArt);
        onOpenEditor();
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
      tags: frontmatter.tags || ['Savunma Sanayii', 'Araştırma'],
      status: 'draft',
      content: body || pasteContent,
      bibtex: '',
    };
    newArt.bibtex = generateBibTeX(newArt);
    onSaveArticle(newArt);
    onSelectArticle(newArt);
    onOpenEditor();
    showToast('Panodaki içerik başarıyla aktarıldı!', 'success');
    setPasteContent('');
    setPasteTitle('');
  };

  return (
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
  );
};
