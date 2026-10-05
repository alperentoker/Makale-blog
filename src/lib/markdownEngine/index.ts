import { slugify } from '../parser';

export type MarkdownBlockType =
  | 'hr'
  | 'code'
  | 'table'
  | 'math'
  | 'callout'
  | 'blockquote'
  | 'heading'
  | 'list'
  | 'paragraph';

export interface BaseBlock {
  id: string;
  type: MarkdownBlockType;
}

export interface HrBlock extends BaseBlock {
  type: 'hr';
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  lang: string;
  code: string;
  lines: string[];
  isAsciiDiagram: boolean;
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

export interface MathBlock extends BaseBlock {
  type: 'math';
  formula: string;
}

export type CalloutType = 'note' | 'warning' | 'insight' | 'theorem';

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  calloutType: CalloutType;
  title: string;
  lines: string[];
}

export interface BlockquoteBlock extends BaseBlock {
  type: 'blockquote';
  lines: string[];
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: number;
  text: string;
  slug: string;
  isSubtitle: boolean;
  subtitleText?: string;
}

export interface ListItem {
  text: string;
  indent?: boolean;
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  ordered: boolean;
  start?: number;
  items: ListItem[];
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  text: string;
}

export type MarkdownBlock =
  | HrBlock
  | CodeBlock
  | TableBlock
  | MathBlock
  | CalloutBlock
  | BlockquoteBlock
  | HeadingBlock
  | ListBlock
  | ParagraphBlock;

export interface ParseMarkdownOptions {
  articleTitle?: string;
  articleDek?: string;
}

/**
 * Universal Markdown Parser Engine for LENS.
 * Parses raw Markdown text into structured, typed MarkdownBlock AST tokens.
 * Shared between Web Editorial Renderer and IEEE TPAMI Academic PDF Viewer.
 */
export function parseMarkdownToBlocks(
  content: string,
  options?: ParseMarkdownOptions
): MarkdownBlock[] {
  if (!content) return [];

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        id: `hr-${i}`,
        type: 'hr',
      });
      i++;
      continue;
    }

    // 3. Fenced Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const codeLang = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      const startIdx = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const codeString = codeLines.join('\n');
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

      blocks.push({
        id: `code-${startIdx}`,
        type: 'code',
        lang: codeLang,
        code: codeString,
        lines: codeLines,
        isAsciiDiagram,
      });
      continue;
    }

    // 4. Markdown Table: lines starting with |
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      const startIdx = i;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map(cell => cell.trim());

        const headers = parseRow(tableLines[0]);
        const alignments = parseRow(tableLines[1]).map(col => {
          if (col.startsWith(':') && col.endsWith(':')) return 'center' as const;
          if (col.endsWith(':')) return 'right' as const;
          return 'left' as const;
        });

        const rows = tableLines.slice(2).map(parseRow);

        blocks.push({
          id: `tbl-${startIdx}`,
          type: 'table',
          headers,
          alignments,
          rows,
        });
        continue;
      }
    }

    // 5. Block Math ($$ ... $$)
    if (trimmed.startsWith('$$')) {
      const startIdx = i;
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

      blocks.push({
        id: `math-${startIdx}`,
        type: 'math',
        formula: mathContent,
      });
      continue;
    }

    // 6. Callout Alert: > [!NOTE] / > [!WARNING] / > [!INSIGHT] / > [!THEOREM]
    if (trimmed.startsWith('> [!')) {
      const startIdx = i;
      const typeMatch = trimmed.match(/> \[!([A-Z]+)\]/i);
      const calloutTypeRaw = typeMatch ? typeMatch[1].toLowerCase() : 'note';
      const calloutType: CalloutType =
        calloutTypeRaw === 'warning'
          ? 'warning'
          : calloutTypeRaw === 'insight'
          ? 'insight'
          : calloutTypeRaw === 'theorem'
          ? 'theorem'
          : 'note';

      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        calloutLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      const titleMap: Record<CalloutType, string> = {
        note: 'Not',
        warning: 'Kritik Uyarı',
        insight: 'Saha İncelemesi',
        theorem: 'Matematiksel Teorem',
      };

      blocks.push({
        id: `callout-${startIdx}`,
        type: 'callout',
        calloutType,
        title: titleMap[calloutType] || 'Not',
        lines: calloutLines,
      });
      continue;
    }

    // 7. Regular Blockquote (> quote)
    if (trimmed.startsWith('>')) {
      const startIdx = i;
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        id: `quote-${startIdx}`,
        type: 'blockquote',
        lines: quoteLines,
      });
      continue;
    }

    // 8. Headings (#, ##, ###, ####)
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      const startIdx = i;
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
        options?.articleTitle &&
        (headingText.toLowerCase() === options.articleTitle.toLowerCase() ||
          options.articleTitle.toLowerCase().includes(headingText.toLowerCase()) ||
          headingText.toLowerCase().includes(options.articleTitle.toLowerCase()))
      ) {
        i++;
        continue;
      }

      // Subtitle detection like "## (4x GPU ...)"
      const isSubtitle = level === 2 && headingText.startsWith('(') && headingText.endsWith(')');
      const subtitleText = isSubtitle ? headingText.slice(1, -1).trim() : undefined;

      // Skip subtitle if identical to articleDek
      if (
        isSubtitle &&
        options?.articleDek &&
        subtitleText &&
        (subtitleText.toLowerCase() === options.articleDek.toLowerCase() ||
          options.articleDek.toLowerCase().includes(subtitleText.toLowerCase()) ||
          subtitleText.toLowerCase().includes(options.articleDek.toLowerCase()))
      ) {
        i++;
        continue;
      }

      blocks.push({
        id: `heading-${startIdx}`,
        type: 'heading',
        level,
        text: headingText,
        slug: slugify(headingText),
        isSubtitle,
        subtitleText,
      });
      i++;
      continue;
    }

    // 9. Unordered List (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      const startIdx = i;
      const listItems: ListItem[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('-') ||
          lines[i].trim().startsWith('*') ||
          (lines[i].startsWith('   ') && lines[i].trim()))
      ) {
        const line = lines[i];
        const isIndented = line.startsWith('   ') || line.startsWith('\t');
        const cleanText = line.trim().replace(/^[-*]\s+/, '');
        listItems.push({ text: cleanText, indent: isIndented });
        i++;
      }

      blocks.push({
        id: `ul-${startIdx}`,
        type: 'list',
        ordered: false,
        items: listItems,
      });
      continue;
    }

    // 10. Ordered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const startIdx = i;
      const firstNumMatch = trimmed.match(/^(\d+)\./);
      const startNum = firstNumMatch ? parseInt(firstNumMatch[1], 10) : 1;

      const listItems: ListItem[] = [];
      while (
        i < lines.length &&
        (/^\d+\.\s+/.test(lines[i].trim()) ||
          (lines[i].startsWith('   ') && lines[i].trim()) ||
          lines[i].trim().startsWith('-') ||
          lines[i].trim().startsWith('*'))
      ) {
        const line = lines[i];
        const isSub = line.startsWith('   ') || line.startsWith('\t') || /^[-*]\s+/.test(line.trim());
        const cleanText = line.trim().replace(/^\d+\.\s+/, '').replace(/^[-*]\s+/, '');
        listItems.push({ text: cleanText, indent: isSub });
        i++;
      }

      blocks.push({
        id: `ol-${startIdx}`,
        type: 'list',
        ordered: true,
        start: startNum,
        items: listItems,
      });
      continue;
    }

    // 11. Regular Paragraph
    const startIdx = i;
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
    if (paragraphText) {
      blocks.push({
        id: `p-${startIdx}`,
        type: 'paragraph',
        text: paragraphText,
      });
    }
  }

  return blocks;
}
