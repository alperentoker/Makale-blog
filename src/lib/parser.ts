import katex from 'katex';
import { TocHeading } from '../types';

export { renderInlineMarkdown } from './inlineMarkdown';

export interface FrontmatterData {
  title?: string;
  dek?: string;
  abstract?: string;
  authors?: Array<{ name: string; affiliation: string; role?: string }>;
  date?: string;
  category?: 'Termal Görüntüleme' | 'Veri Mühendisliği' | 'Kenar Yapay Zeka' | 'Edge AI';
  tags?: string[];
  version?: string;
  doi?: string;
  status?: 'draft' | 'under_review' | 'published';
  series?: {
    id: string;
    name: string;
    phase: string;
    stepNumber: number;
    totalSteps: number;
  };
  [key: string]: unknown;
}

export function extractFrontmatter(rawContent: string): { frontmatter: FrontmatterData; body: string } {
  const trimmed = rawContent.trim();
  
  // If starts with YAML frontmatter delimiter ---
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('---', 3);
    if (endIdx !== -1) {
      const frontmatterStr = trimmed.slice(3, endIdx).trim();
      const body = trimmed.slice(endIdx + 3).trim();
      const frontmatter: FrontmatterData = {};

      const lines = frontmatterStr.split('\n');
      let currentKey = '';
      let inArray = false;
      const tempArray: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        if (trimmedLine.startsWith('- ') && inArray) {
          tempArray.push(trimmedLine.slice(2).trim().replace(/^['"](.*)['"]$/, '$1'));
          continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          if (inArray && currentKey) {
            frontmatter[currentKey] = [...tempArray];
            inArray = false;
            tempArray.length = 0;
          }

          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();

          if (value === '') {
            currentKey = key;
            inArray = true;
          } else {
            const cleanedVal = value.replace(/^['"](.*)['"]$/, '$1');
            frontmatter[key] = cleanedVal;
          }
        }
      }

      if (inArray && currentKey) {
        frontmatter[currentKey] = [...tempArray];
      }

      return { frontmatter, body };
    }
  }

  // If no YAML frontmatter, check for # Title and ## Subtitle at top
  const lines = trimmed.split('\n');
  const frontmatter: FrontmatterData = {
    authors: [
      {
        name: 'Alperen Toker',
        affiliation: 'Yapay Zeka & Bilgisayarlı Görü',
        role: 'Yazar',
      }
    ],
  };
  let bodyStartIndex = 0;

  for (let idx = 0; idx < Math.min(lines.length, 5); idx++) {
    const line = lines[idx].trim();
    if (line.startsWith('# ') && !frontmatter.title) {
      frontmatter.title = line.slice(2).trim();
      bodyStartIndex = idx + 1;
    } else if (line.startsWith('## ') && frontmatter.title && !frontmatter.dek) {
      frontmatter.dek = line.slice(3).trim().replace(/^\((.*)\)$/, '$1');
      bodyStartIndex = idx + 1;
    }
  }

  const remainingLines = lines.slice(bodyStartIndex);
  // Auto extract abstract from first genuine paragraph
  const firstPara = remainingLines.find(
    l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('---') && !l.trim().startsWith('```')
  );
  if (firstPara) {
    frontmatter.abstract = firstPara.trim().slice(0, 400);
  }

  return { frontmatter, body: remainingLines.join('\n').trim() };
}

export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
  };

  let str = text;
  for (const key of Object.keys(trMap)) {
    str = str.replace(new RegExp(key, 'g'), trMap[key]);
  }

  const slug = str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'bolum';
}

export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      // If it's a subtitle wrapped in parentheses like "(4x GPU ...)", it's a dek, skip from TOC
      if (text.startsWith('(') && text.endsWith(')')) {
        continue;
      }
      headings.push({
        id: slugify(text),
        text: text,
        level: 2,
      });
    } else if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      headings.push({
        id: slugify(text),
        text,
        level: 3,
      });
    }
  }

  return headings;
}

export function renderKaTeX(latex: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch (err) {
    console.error('KaTeX rendering error:', err);
    return `<code class="font-mono text-tactical-amber bg-paper-200 px-1 py-0.5 rounded text-sm">${latex}</code>`;
  }
}

export function estimateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} dk okuma süresi`;
}
