import React from 'react';
import { renderKaTeX, renderInlineMarkdown, slugify } from './parser';
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
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let isFirstParagraph = enableDropCap;

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line -> skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal Rule (--- or *** or ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr
          key={`hr-${i}`}
          className="my-8 border-0 h-px bg-paper-300/80 dark:bg-paper-800/80"
        />
      );
      i++;
      continue;
    }

    // 3. Fenced Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const codeLang = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const codeString = codeLines.join('\n');
      const blockIdx = i;

      // Detect if this is an ASCII diagram / workflow chart
      const isAsciiDiagram =
        codeLang === 'text' ||
        codeLang === 'ascii' ||
        codeString.includes('┌') ||
        codeString.includes('──') ||
        codeString.includes('│') ||
        codeString.includes('+---') ||
        (codeString.includes('|') && codeString.includes('==>')) ||
        codeString.includes('BİLİMSEL İŞ AKIŞI') ||
        codeString.includes('BÜYÜK TURNUVA');

      if (isAsciiDiagram) {
        elements.push(
          <div
            key={`diagram-${blockIdx}`}
            className="my-7 rounded-xl border border-tactical-800/40 dark:border-tactical-500/30 bg-[#0E1015] text-slate-100 overflow-hidden shadow-paper"
          >
            {/* Diagram Header Bar */}
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
                onClick={() => handleCopyCode(codeString, blockIdx)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[11px]"
                title="Şemayı Kopyala"
              >
                {copiedIdx === blockIdx ? (
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

            {/* Diagram Canvas: Clean Monospace, Strict Alignment, No Ligatures, Line Height 1.25 */}
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
                {codeString}
              </pre>
            </div>
          </div>
        );
      } else {
        // Standard code block with line numbers & diff coloring
        elements.push(
          <div
            key={`code-${blockIdx}`}
            className="my-7 rounded border border-paper-300 dark:border-paper-800 bg-[#12141A] text-slate-100 overflow-hidden shadow-paper"
          >
            {/* Code Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0C0E13] text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-paper-400" />
                <span className="text-white/70 ml-1 font-semibold uppercase tracking-wider text-[11px]">
                  {codeLang}
                </span>
              </div>

              <button
                onClick={() => handleCopyCode(codeString, blockIdx)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-[11px]"
                title="Kodu Kopyala"
              >
                {copiedIdx === blockIdx ? (
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

            {/* Code Body with line numbers and diff coloring */}
            <div
              className="p-4 font-mono text-[13px] leading-relaxed overflow-x-auto bg-[#0E1015]"
              style={{
                fontVariantLigatures: 'none',
                fontFeatureSettings: '"liga" 0, "calt" 0',
              }}
            >
              {codeLines.map((cLine, lineIdx) => {
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
      }
      continue;
    }

    // 4. Markdown Table: lines starting with |
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) => {
          return rowStr
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(cell => cell.trim());
        };

        const headers = parseRow(tableLines[0]);
        // Extract alignment from separator line (row 1 like | :--- | :---: | ---: |)
        const alignments = parseRow(tableLines[1]).map(col => {
          if (col.startsWith(':') && col.endsWith(':')) return 'center';
          if (col.endsWith(':')) return 'right';
          return 'left';
        });

        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div
            key={`tbl-${i}`}
            className="my-7 rounded border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 shadow-paper overflow-x-auto"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-paper-300 dark:border-paper-800 bg-paper-150 dark:bg-paper-900 text-ink-800 dark:text-paper-100 font-mono">
                  {headers.map((h, hIdx) => {
                    const align = alignments[hIdx] || 'left';
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
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-paper-150/70 dark:hover:bg-paper-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => {
                      const align = alignments[cIdx] || 'left';
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
        continue;
      }
    }

    // 5. Block Math ($$ ... $$)
    if (trimmed.startsWith('$$')) {
      let mathContent = '';
      if (trimmed.endsWith('$$') && trimmed.length > 4) {
        mathContent = trimmed.slice(2, -2).trim();
        i++;
      } else {
        const mathLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].replace(/\$\$$/, ''));
          i++;
        }
        mathContent = mathLines.join('\n').trim();
      }

      elements.push(
        <div
          key={`math-${i}`}
          className="my-6 overflow-x-auto text-center font-serif text-lg text-ink-950 dark:text-paper-50"
          dangerouslySetInnerHTML={{ __html: renderKaTeX(mathContent, true) }}
        />
      );
      continue;
    }

    // 6. Callout Alert: > [!NOTE] / > [!WARNING] / > [!INSIGHT] / > [!THEOREM]
    if (trimmed.startsWith('> [!')) {
      const typeMatch = trimmed.match(/> \[!([A-Z]+)\]/i);
      const calloutType = typeMatch ? typeMatch[1].toLowerCase() : 'note';
      const calloutLines: string[] = [];
      i++;

      while (i < lines.length && lines[i].trim().startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      let icon = <Info className="w-5 h-5 text-tactical-800 dark:text-tactical-400 mt-0.5 shrink-0" />;
      let title = 'Not';
      let borderClass = 'callout-note';

      if (calloutType === 'warning') {
        icon = <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />;
        title = 'Kritik Uyarı';
        borderClass = 'callout-warning';
      } else if (calloutType === 'insight') {
        icon = <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />;
        title = 'Saha İncelemesi';
        borderClass = 'callout-insight';
      } else if (calloutType === 'theorem') {
        icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />;
        title = 'Matematiksel Teorem';
        borderClass = 'callout-theorem';
      }

      elements.push(
        <div key={`callout-${i}`} className={`callout ${borderClass} shadow-paper-sm flex gap-3 my-5`}>
          {icon}
          <div className="flex-1">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">
              {title}
            </div>
            <div className="text-[0.93em] leading-relaxed">
              {calloutLines.map((cLine, cIdx) => (
                <p key={cIdx} className="mb-1 last:mb-0">
                  {renderInlineMarkdown(cLine)}
                </p>
              ))}
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 7. Regular Blockquote (> quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-5 pl-4 border-l-3 border-tactical-800 dark:border-tactical-500 font-serif italic text-ink-700 dark:text-paper-300 text-[1.02em]"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx} className="mb-1 last:mb-0">
              {renderInlineMarkdown(qLine)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 8. Headings (#, ##, ###, ####)
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      let level = 1;
      let headingText = '';

      if (trimmed.startsWith('#### ')) {
        level = 4;
        headingText = trimmed.slice(5).trim();
      } else if (trimmed.startsWith('### ')) {
        level = 3;
        headingText = trimmed.slice(4).trim();
      } else if (trimmed.startsWith('## ')) {
        level = 2;
        headingText = trimmed.slice(3).trim();
      } else {
        level = 1;
        headingText = trimmed.slice(2).trim();
      }

      // Deduplicate H1 if it matches articleTitle
      if (
        level === 1 &&
        articleTitle &&
        (headingText.toLowerCase() === articleTitle.toLowerCase() ||
         articleTitle.toLowerCase().includes(headingText.toLowerCase()) ||
         headingText.toLowerCase().includes(articleTitle.toLowerCase()))
      ) {
        i++;
        continue;
      }

      // Check if it's a subtitle wrapped in parentheses like "## (4x GPU ...)"
      if (level === 2 && headingText.startsWith('(') && headingText.endsWith(')')) {
        const subtitleText = headingText.slice(1, -1);
        if (
          articleDek &&
          (subtitleText.toLowerCase() === articleDek.toLowerCase() ||
           articleDek.toLowerCase().includes(subtitleText.toLowerCase()) ||
           subtitleText.toLowerCase().includes(articleDek.toLowerCase()))
        ) {
          i++;
          continue;
        }

        elements.push(
          <p
            key={`subtitle-${i}`}
            className="text-lg sm:text-xl font-serif italic text-ink-700 dark:text-paper-300 leading-relaxed mb-6"
          >
            {renderInlineMarkdown(subtitleText)}
          </p>
        );
        i++;
        continue;
      }

      const id = slugify(headingText);

      if (level === 1) {
        // H1 Title heading: Clean and bold without harsh borders
        elements.push(
          <h1
            key={`h1-${i}`}
            id={id}
            className={`text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-ink-950 dark:text-paper-50 tracking-tight leading-snug ${
              elements.length === 0 ? 'mb-4' : 'mt-10 mb-4'
            }`}
          >
            {renderInlineMarkdown(headingText)}
          </h1>
        );
      } else if (level === 2) {
        // H2 Section heading: Clean spacing, no forced top border to prevent double-line clashes
        elements.push(
          <h2
            key={`h2-${i}`}
            id={id}
            className="text-xl sm:text-2xl font-serif font-bold text-ink-950 dark:text-paper-50 mt-10 mb-4 tracking-tight flex items-center gap-2"
          >
            {renderInlineMarkdown(headingText)}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3
            key={`h3-${i}`}
            id={id}
            className="text-lg font-sans font-semibold text-ink-900 dark:text-paper-100 mt-6 mb-2 tracking-tight"
          >
            {renderInlineMarkdown(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={`h4-${i}`}
            id={id}
            className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-paper-300 mt-4 mb-1"
          >
            {renderInlineMarkdown(headingText)}
          </h4>
        );
      }

      i++;
      continue;
    }

    // 9. Unordered List (- item or * item) with nested item support
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: Array<{ text: string; indent: boolean }> = [];
      while (i < lines.length && (lines[i].trim().startsWith('-') || lines[i].trim().startsWith('*') || (lines[i].startsWith('   ') && lines[i].trim()))) {
        const line = lines[i];
        const isIndented = line.startsWith('   ') || line.startsWith('\t');
        const cleanText = line.trim().replace(/^[-*]\s+/, '');
        listItems.push({ text: cleanText, indent: isIndented });
        i++;
      }

      elements.push(
        <ul
          key={`ul-${i}`}
          className="my-4 space-y-1.5 list-disc list-outside pl-5 text-[1em] leading-relaxed text-ink-800 dark:text-paper-200 font-sans"
        >
          {listItems.map((item, itemIdx) => (
            <li
              key={itemIdx}
              className={item.indent ? 'ml-5 list-[circle] text-ink-700 dark:text-paper-300' : 'pl-0.5'}
            >
              {renderInlineMarkdown(item.text)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 10. Ordered List (1. item, 2. item) with nested bullet support
    if (/^\d+\.\s+/.test(trimmed)) {
      const firstNumMatch = trimmed.match(/^(\d+)\./);
      const startNum = firstNumMatch ? parseInt(firstNumMatch[1], 10) : 1;

      const listItems: Array<{ text: string; isSub: boolean }> = [];
      while (
        i < lines.length &&
        (/^\d+\.\s+/.test(lines[i].trim()) || (lines[i].startsWith('   ') && lines[i].trim()))
      ) {
        const line = lines[i];
        const isSub = line.startsWith('   ') || line.startsWith('\t') || /^[-*]\s+/.test(line.trim());
        const cleanText = line.trim().replace(/^\d+\.\s+/, '').replace(/^[-*]\s+/, '');
        listItems.push({ text: cleanText, isSub });
        i++;
      }

      elements.push(
        <ol
          key={`ol-${i}`}
          start={startNum}
          className="my-4 space-y-2 list-decimal list-outside pl-5 text-[1em] leading-relaxed text-ink-800 dark:text-paper-200 font-sans"
        >
          {listItems.map((item, itemIdx) => (
            <li
              key={itemIdx}
              className={item.isSub ? 'ml-5 list-disc text-ink-700 dark:text-paper-300' : 'pl-0.5'}
            >
              {renderInlineMarkdown(item.text)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 11. Regular Paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('> [!') &&
      !lines[i].trim().startsWith('$$') &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    const paragraphText = paragraphLines.join(' ');

    // Only apply drop-cap if it genuinely starts with a standard letter [A-Z], never for emojis, numbers or symbols
    const shouldDropCap =
      isFirstParagraph &&
      /^[A-Za-zÇĞİÖŞÜçğıöşü]/.test(paragraphText);

    elements.push(
      <p
        key={`p-${i}`}
        className={`leading-[1.8] text-ink-900 dark:text-paper-150 mb-5 text-[1em] font-sans ${
          shouldDropCap ? 'drop-cap font-serif text-[1.08em]' : ''
        }`}
      >
        {renderInlineMarkdown(paragraphText)}
      </p>
    );

    isFirstParagraph = false;
  }

  return <div className="prose-editorial">{elements}</div>;
};
