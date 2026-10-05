import React, { useState, useMemo } from 'react';
import { Printer, ZoomIn, ZoomOut, RotateCcw, FileText, ArrowLeft } from 'lucide-react';
import { Article } from '../types';
import { renderKaTeX, renderInlineMarkdown } from '../lib/parser';
import { parseMarkdownToBlocks } from '../lib/markdownEngine';

interface IeeePdfViewerProps {
  article: Article;
  onSwitchToWeb: () => void;
}

// Convert section numbers like "1.", "2." to Roman numerals for IEEE style
function toRoman(num: number): string {
  const romanMap: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  for (const [val, sym] of romanMap) {
    while (num >= val) {
      result += sym;
      num -= val;
    }
  }
  return result || 'I';
}

function formatIeeeHeading(text: string, index: number): string {
  // Strip leading numbers or emojis
  const clean = text
    .replace(/^\p{Extended_Pictographic}+\s*/u, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
  const roman = toRoman(index + 1);
  return `${roman}. ${clean.toUpperCase()}`;
}

export const IeeePdfViewer: React.FC<IeeePdfViewerProps> = ({
  article,
  onSwitchToWeb,
}) => {
  const [zoom, setZoom] = useState<number>(100);

  const handlePrint = () => {
    window.print();
  };

  const blocks = useMemo(
    () => parseMarkdownToBlocks(article.content, { articleTitle: article.title, articleDek: article.dek }),
    [article.content, article.title, article.dek]
  );

  // Render AST blocks into IEEE styled elements
  const renderDynamicContent = () => {
    let sectionCount = 0;

    return blocks.map((block) => {
      switch (block.type) {
        case 'hr':
          return null;

        case 'code':
          return (
            <div
              key={block.id}
              className="my-3 p-2 bg-neutral-50 border border-neutral-300 rounded font-mono text-[9.5px] leading-snug overflow-x-auto break-inside-avoid select-all"
            >
              <pre className="whitespace-pre">{block.code}</pre>
            </div>
          );

        case 'heading': {
          if (block.isSubtitle && block.subtitleText) {
            return (
              <p key={block.id} className="italic text-neutral-600 text-[10.5px] mb-2 text-center">
                ({block.subtitleText})
              </p>
            );
          }

          if (block.level === 2) {
            const ieeeHeading = formatIeeeHeading(block.text, sectionCount++);
            return (
              <h2
                key={block.id}
                className="text-[11px] font-sans font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-0.5 mt-4 mb-2 break-inside-avoid text-center"
              >
                {ieeeHeading}
              </h2>
            );
          }

          if (block.level === 3) {
            return (
              <h3
                key={block.id}
                className="text-[10.5px] font-sans font-bold text-neutral-800 mt-3 mb-1 break-inside-avoid"
              >
                {block.text}
              </h3>
            );
          }

          return (
            <h2
              key={block.id}
              className="text-[11.5px] font-sans font-bold uppercase text-neutral-900 border-b border-neutral-400 pb-0.5 mt-4 mb-2 break-inside-avoid"
            >
              {block.text}
            </h2>
          );
        }

        case 'table':
          return (
            <div key={block.id} className="my-3 border border-neutral-300 text-[9.5px] font-sans break-inside-avoid">
              <div className="bg-neutral-100 p-1 font-bold text-center border-b border-neutral-300 uppercase tracking-wide">
                TABLE: {block.headers.join(' · ')}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-300 bg-neutral-50 font-semibold">
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-1 border-r border-neutral-200 last:border-r-0">
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {block.rows.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-neutral-50">
                        {r.map((cell, cIdx) => (
                          <td key={cIdx} className="p-1 border-r border-neutral-200 last:border-r-0">
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );

        case 'math':
          return (
            <div
              key={block.id}
              className="py-1.5 text-center font-serif my-2 break-inside-avoid overflow-x-auto text-[11px]"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(block.formula, true) }}
            />
          );

        case 'list':
          return (
            <ul
              key={block.id}
              className={`my-2 space-y-1 text-[11px] text-justify leading-relaxed ${
                block.ordered ? 'list-decimal pl-5' : 'list-disc pl-4'
              }`}
            >
              {block.items.map((it, itIdx) => (
                <li key={itIdx}>{renderInlineMarkdown(it.text)}</li>
              ))}
            </ul>
          );

        case 'callout':
        case 'blockquote':
          return (
            <blockquote
              key={block.id}
              className="my-2 pl-3 border-l-2 border-neutral-400 italic text-[11px] text-neutral-700 break-inside-avoid"
            >
              {block.lines.map((ql, qIdx) => (
                <p key={qIdx}>{renderInlineMarkdown(ql)}</p>
              ))}
            </blockquote>
          );

        case 'paragraph':
          return (
            <p key={block.id} className="indent-4 mb-2 text-[11px] text-justify leading-[1.48]">
              {renderInlineMarkdown(block.text)}
            </p>
          );

        default:
          return null;
      }
    });
  };

  return (
    <div className="bg-paper-300 dark:bg-ink-950 min-h-screen py-6 px-2 sm:px-4">
      {/* Top Floating Control Bar */}
      <div className="no-print max-w-5xl mx-auto mb-6 bg-paper-100 dark:bg-paper-900 border border-paper-400 dark:border-paper-800 rounded shadow-paper-md p-3 flex flex-wrap items-center justify-between gap-3 sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToWeb}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-800 hover:bg-paper-200 dark:hover:bg-paper-700 text-ink-800 dark:text-paper-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Web Editoryal Görünümüne Dön</span>
          </button>

          <span className="hidden sm:inline-block h-4 w-[1px] bg-paper-300 dark:bg-paper-700" />

          <div className="flex items-center gap-1.5 text-xs font-mono text-ink-600 dark:text-ink-400">
            <FileText className="w-4 h-4 text-tactical-800 dark:text-tactical-400" />
            <span className="font-semibold text-ink-900 dark:text-paper-100">
              IEEE TPAMI Formatı (A4 / 2-Sütun Dinamik)
            </span>
          </div>
        </div>

        {/* Zoom & Print Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-800 p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(70, z - 10))}
              className="p-1 hover:bg-paper-200 dark:hover:bg-paper-700 rounded text-ink-700 dark:text-ink-300"
              title="Küçült"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs px-2 text-ink-700 dark:text-ink-300 min-w-[45px] text-center">
              %{zoom}
            </span>
            <button
              onClick={() => setZoom(z => Math.min(140, z + 10))}
              className="p-1 hover:bg-paper-200 dark:hover:bg-paper-700 rounded text-ink-700 dark:text-ink-300"
              title="Büyüt"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-paper-200 dark:hover:bg-paper-700 rounded text-ink-700 dark:text-ink-300"
              title="Sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded bg-tactical-800 hover:bg-tactical-900 text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Yazdır / PDF Olarak Kaydet</span>
          </button>
        </div>
      </div>

      {/* Scaled PDF Document Sheet */}
      <div
        className="transition-transform duration-150 origin-top flex justify-center pb-12"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        <div className="ieee-paper-sheet bg-white text-black leading-tight selection:bg-blue-100 shadow-2xl p-8 sm:p-12 max-w-[210mm] w-full min-h-[297mm]">
          {/* Running Header */}
          <div className="border-b border-black/20 pb-2 mb-6 flex justify-between text-[10px] font-sans tracking-wide uppercase text-neutral-600">
            <span>LENS // SAVUNMA VE BİLGİSAYARLI GÖRÜ YAYINLARI, {article.displayDate.toUpperCase()}</span>
            <span className="font-mono">{article.doi ? `DOI: ${article.doi}` : 'ARŞİV // ÖN BASKI (PREPRINT)'}</span>
          </div>

          {/* Paper Title */}
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-center leading-snug tracking-tight text-neutral-900 mb-4 px-4">
            {article.title}
          </h1>

          {/* Authors List */}
          <div className="text-center mb-6">
            <div className="text-xs font-sans font-medium text-neutral-800 flex flex-wrap justify-center gap-x-6 gap-y-1">
              {article.authors.map((author, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="font-semibold text-neutral-900">{author.name}</span>
                  <span className="text-[10px] text-neutral-600 italic">
                    {author.affiliation || 'Yapay Zeka & Bilgisayarlı Görü'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Abstract & Keywords Box */}
          {article.abstract && (
            <div className="mb-6 px-4 text-xs text-justify border-y border-neutral-300 py-3 font-serif">
              <p className="leading-relaxed">
                <strong className="font-sans uppercase text-[11px] tracking-wider text-black mr-2">
                  Abstract—
                </strong>
                {article.abstract}
              </p>
              {article.keywords && article.keywords.length > 0 && (
                <p className="mt-2 text-[10.5px] font-sans text-neutral-700">
                  <strong>Index Terms—</strong> {article.keywords.join(', ')}.
                </p>
              )}
            </div>
          )}

          {/* 2-Column Dynamic Academic Body */}
          <div className="columns-1 sm:columns-2 gap-8 text-neutral-900 font-serif leading-relaxed">
            {renderDynamicContent()}

            {/* Auto Reference Section */}
            <div className="break-inside-avoid mt-6 pt-3 border-t border-neutral-300">
              <h2 className="text-[10.5px] font-sans font-bold uppercase tracking-wider text-neutral-900 mb-2 text-center">
                REFERENCES
              </h2>
              <ol className="list-decimal pl-4 space-y-1 text-[9px] font-sans text-neutral-700">
                <li>
                  {article.authors.map(a => a.name).join(', ')}, &ldquo;{article.title},&rdquo;{' '}
                  <em>LENS Araştırma Yayınları</em>, {article.displayDate}. URL: https://lens.alperentoker.com
                </li>
                <li>
                  Ultralytics, &ldquo;YOLO11: Real-Time Object Detection and Segmentation,&rdquo; 2024.
                </li>
                <li>
                  Y. Peng et al., &ldquo;D-FINE: Redefine Bounding Box Regression for Real-Time Object Detection,&rdquo;{' '}
                  <em>ICLR</em>, 2025.
                </li>
              </ol>
            </div>
          </div>

          {/* Running Footer */}
          <div className="border-t border-black/20 pt-2 mt-10 flex justify-between text-[10px] font-sans text-neutral-600">
            <span>LENS: Savunma ve Bilgisayarlı Görü Araştırma Yayınları — https://lens.alperentoker.com</span>
            <span className="font-mono">Sayfa 1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IeeePdfViewer;
