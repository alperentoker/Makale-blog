import React, { useState, useMemo } from 'react';
import { renderKaTeX, renderInlineMarkdown } from './parser';
import { copyToClipboard } from './clipboard';
import { parseMarkdownToBlocks } from './markdownEngine';
import { 
  Info, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2, 
  Copy, 
  Check,
  Workflow,
  Terminal
} from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  enableDropCap?: boolean;
  articleTitle?: string;
  articleDek?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  enableDropCap = false,
  articleTitle,
  articleDek,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = async (code: string, id: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const blocks = useMemo(
    () => parseMarkdownToBlocks(content, { articleTitle, articleDek }),
    [content, articleTitle, articleDek]
  );

  const firstParagraphIdx = enableDropCap ? blocks.findIndex(b => b.type === 'paragraph') : -1;

  return (
    <div className="prose-editorial">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'hr':
            return (
              <hr
                key={block.id}
                className="my-8 border-0 h-px bg-paper-300/80 dark:bg-paper-800/80"
              />
            );

          case 'code':
            if (block.isAsciiDiagram) {
              return (
                <div
                  key={block.id}
                  className="my-7 rounded-xl border border-tactical-800/40 dark:border-tactical-500/30 bg-[#0E1015] text-slate-100 overflow-hidden shadow-paper"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#080A0D] text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Workflow className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white/90 font-semibold tracking-wider text-[11px] uppercase">
                        MİMARİ AKIŞ ŞEMASI
                      </span>
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">
                        MONOSPACE GRID // STRICT COLUMNS
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(block.code, block.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[11px]"
                      title="Şemayı Kopyala"
                    >
                      {copiedId === block.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-x-auto text-emerald-300 dark:text-emerald-400 bg-[#0B0D11] scrollbar-thin select-all">
                    <pre
                      className="font-mono text-[12px] sm:text-[13px] inline-block min-w-full"
                      style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
                        fontVariantLigatures: 'none',
                        fontFeatureSettings: '"liga" 0, "calt" 0',
                        letterSpacing: '0px',
                        lineHeight: '1.25',
                        whiteSpace: 'pre',
                        wordBreak: 'normal',
                        overflowWrap: 'normal',
                      }}
                    >
                      {block.code}
                    </pre>
                  </div>
                </div>
              );
            }

            // Standard code block with syntax/diff lines
            return (
              <div
                key={block.id}
                className="my-7 rounded border border-paper-300 dark:border-paper-800 bg-[#12141A] text-slate-100 overflow-hidden shadow-paper"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0C0E13] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-paper-400" />
                    <span className="text-white/70 ml-1 font-semibold uppercase tracking-wider text-[11px]">
                      {block.lang}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(block.code, block.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[11px]"
                    title="Kodu Kopyala"
                  >
                    {copiedId === block.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className="p-4 font-mono text-[13px] leading-relaxed overflow-x-auto bg-[#0E1015]"
                  style={{
                    fontVariantLigatures: 'none',
                    fontFeatureSettings: '"liga" 0, "calt" 0',
                  }}
                >
                  {block.lines.map((cLine, lineIdx) => {
                    const isAdd = cLine.startsWith('+');
                    const isDel = cLine.startsWith('-');

                    return (
                      <div
                        key={lineIdx}
                        className={`flex gap-3 px-1.5 py-0.5 rounded-sm ${
                          isAdd
                            ? 'bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500'
                            : isDel
                            ? 'bg-rose-950/60 text-rose-300 line-through opacity-75 border-l-2 border-rose-500'
                            : 'text-slate-200'
                        }`}
                      >
                        <span className="text-slate-500 select-none text-right w-6 shrink-0 text-xs">
                          {lineIdx + 1}
                        </span>
                        <span className="whitespace-pre">{cLine}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );

          case 'table':
            return (
              <div
                key={block.id}
                className="my-7 rounded border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 shadow-paper overflow-x-auto"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-900 text-ink-800 dark:text-paper-100 font-mono">
                      {block.headers.map((h, hIdx) => {
                        const align = block.alignments[hIdx] || 'left';
                        return (
                          <th
                            key={hIdx}
                            className={`py-2.5 px-3.5 font-semibold whitespace-nowrap ${
                              align === 'center'
                                ? 'text-center'
                                : align === 'right'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {renderInlineMarkdown(h)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-200 dark:divide-paper-800 font-sans">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-paper-150/70 dark:hover:bg-paper-800/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => {
                          const align = block.alignments[cIdx] || 'left';
                          const isStatus = cell === 'Referans' || cell === 'Aday';
                          const isMetric = /^[~*]?\d+(\.\d+)?[M%]?[*]?$/.test(cell);

                          return (
                            <td
                              key={cIdx}
                              className={`py-2 px-3.5 text-ink-800 dark:text-paper-100 ${
                                align === 'center'
                                  ? 'text-center'
                                  : align === 'right'
                                  ? 'text-right'
                                  : 'text-left'
                              } ${cIdx === 0 ? 'font-medium' : ''} ${isMetric ? 'font-mono text-xs' : ''}`}
                            >
                              {isStatus ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                                    cell === 'Referans'
                                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  {cell}
                                </span>
                              ) : (
                                renderInlineMarkdown(cell)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'math':
            return (
              <div
                key={block.id}
                className="my-6 overflow-x-auto text-center font-serif text-lg text-ink-950 dark:text-paper-50"
                dangerouslySetInnerHTML={{ __html: renderKaTeX(block.formula, true) }}
              />
            );

          case 'callout': {
            let icon = <Info className="w-5 h-5 text-tactical-800 dark:text-tactical-400 mt-0.5 shrink-0" />;
            let borderClass = 'callout-note';

            if (block.calloutType === 'warning') {
              icon = <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />;
              borderClass = 'callout-warning';
            } else if (block.calloutType === 'insight') {
              icon = <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />;
              borderClass = 'callout-insight';
            } else if (block.calloutType === 'theorem') {
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />;
              borderClass = 'callout-theorem';
            }

            return (
              <div key={block.id} className={`callout ${borderClass} shadow-paper-sm flex gap-3 my-5`}>
                {icon}
                <div className="flex-1">
                  <div className="font-mono text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">
                    {block.title}
                  </div>
                  <div className="text-[0.93em] leading-relaxed">
                    {block.lines.map((cLine, cIdx) => (
                      <p key={cIdx} className="mb-1 last:mb-0">
                        {renderInlineMarkdown(cLine)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          case 'blockquote':
            return (
              <blockquote
                key={block.id}
                className="my-5 pl-4 border-l-3 border-tactical-800 dark:border-tactical-500 font-serif italic text-ink-700 dark:text-paper-300 text-[1.02em]"
              >
                {block.lines.map((qLine, qIdx) => (
                  <p key={qIdx} className="mb-1 last:mb-0">
                    {renderInlineMarkdown(qLine)}
                  </p>
                ))}
              </blockquote>
            );

          case 'heading': {
            if (block.isSubtitle && block.subtitleText) {
              return (
                <p
                  key={block.id}
                  className="text-lg sm:text-xl font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed mb-6"
                >
                  {renderInlineMarkdown(block.subtitleText)}
                </p>
              );
            }

            if (block.level === 1) {
              return (
                <h1
                  key={block.id}
                  id={block.slug}
                  className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-950 dark:text-paper-50 tracking-tight leading-snug my-6"
                >
                  {renderInlineMarkdown(block.text)}
                </h1>
              );
            }

            if (block.level === 2) {
              return (
                <h2
                  key={block.id}
                  id={block.slug}
                  className="text-xl sm:text-2xl font-serif font-bold text-ink-950 dark:text-paper-50 mt-10 mb-4 tracking-tight flex items-center gap-2"
                >
                  {renderInlineMarkdown(block.text)}
                </h2>
              );
            }

            if (block.level === 3) {
              return (
                <h3
                  key={block.id}
                  id={block.slug}
                  className="text-lg font-sans font-semibold text-ink-900 dark:text-paper-100 mt-6 mb-2 tracking-tight"
                >
                  {renderInlineMarkdown(block.text)}
                </h3>
              );
            }

            return (
              <h4
                key={block.id}
                id={block.slug}
                className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-paper-300 mt-4 mb-1"
              >
                {renderInlineMarkdown(block.text)}
              </h4>
            );
          }

          case 'list': {
            if (block.ordered) {
              return (
                <ol
                  key={block.id}
                  start={block.start}
                  className="my-4 space-y-2 list-decimal list-outside pl-5 text-[1em] leading-relaxed text-ink-800 dark:text-paper-200 font-sans"
                >
                  {block.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className={item.indent ? 'ml-5 list-disc text-ink-700 dark:text-paper-300' : 'pl-0.5'}
                    >
                      {renderInlineMarkdown(item.text)}
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <ul
                key={block.id}
                className="my-4 space-y-1.5 list-disc list-outside pl-5 text-[1em] leading-relaxed text-ink-800 dark:text-paper-200 font-sans"
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className={item.indent ? 'ml-5 list-[circle] text-ink-700 dark:text-paper-300' : 'pl-0.5'}
                  >
                    {renderInlineMarkdown(item.text)}
                  </li>
                ))}
              </ul>
            );
          }

          case 'paragraph': {
            const shouldDropCap =
              idx === firstParagraphIdx &&
              /^[A-Za-zÇĞİÖŞÜçğıöşü]/.test(block.text);

            return (
              <p
                key={block.id}
                className={`leading-[1.8] text-ink-900 dark:text-paper-150 mb-5 text-[1em] font-sans ${
                  shouldDropCap ? 'drop-cap font-serif text-[1.08em]' : ''
                }`}
              >
                {renderInlineMarkdown(block.text)}
              </p>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
