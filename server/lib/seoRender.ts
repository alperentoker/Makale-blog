// Server-side Markdown → semantic HTML for SEO.
//
// The public site is a client-rendered React SPA, so the raw HTML a crawler
// first receives contains no article text. This module produces an escaped,
// lightweight HTML representation of an article body that we inject inside a
// <noscript> block, giving search engines real, indexable content and heading
// structure without depending on JavaScript execution.
//
// It is intentionally dependency-free (no React, no KaTeX) and every piece of
// untrusted text is HTML-escaped.

export function escapeHtml(text: string = ''): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Reduce inline Markdown (`**bold**`, `` `code` ``, [text](url), $math$) to readable text.
function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
    .replace(/(^|\s)_([^_]+)_/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\([*_`])/g, '$1')
    .trim();
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
}

function renderTableRow(line: string, tag: 'th' | 'td'): string {
  const cells = line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => `<${tag}>${escapeHtml(stripInline(cell.trim()))}</${tag}>`)
    .join('');
  return `<tr>${cells}</tr>`;
}

/**
 * Convert a Markdown article body into semantic, escaped HTML suitable for a
 * <noscript> SEO fallback. Unknown constructs degrade to <p> text.
 */
export function markdownToSeoHtml(markdown: string): string {
  if (!markdown) return '';
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${escapeHtml(stripInline(paragraph.join(' ')))}</p>`);
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      flushParagraph();
      i++;
      const code: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      out.push('<hr/>');
      i++;
      continue;
    }

    // Heading (#..######)
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      out.push(`<h${level}>${escapeHtml(stripInline(heading[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${escapeHtml(stripInline(quote.join(' ')))}</blockquote>`);
      continue;
    }

    // List (unordered or ordered)
    if (/^([-*+]|\d+\.)\s+/.test(trimmed)) {
      flushParagraph();
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && /^([-*+]|\d+\.)\s+/.test(lines[i].trim())) {
        items.push(`<li>${escapeHtml(stripInline(lines[i].trim().replace(/^([-*+]|\d+\.)\s+/, '')))}</li>`);
        i++;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    // Table (header row followed by a separator row)
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph();
      let table = `<table><thead>${renderTableRow(trimmed, 'th')}</thead><tbody>`;
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        table += renderTableRow(lines[i], 'td');
        i++;
      }
      table += '</tbody></table>';
      out.push(table);
      continue;
    }

    paragraph.push(trimmed);
    i++;
  }

  flushParagraph();
  return out.join('\n');
}
