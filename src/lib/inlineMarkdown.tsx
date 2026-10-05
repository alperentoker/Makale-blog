import React from 'react';
import { renderKaTeX } from './parser';

// Render inline Markdown elements: $math$, **bold**, *italic*, `code`, [link](url)
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Clean unescaped bold edge cases like "**Ad \* :**" -> "**Ad \*:**"
  // Token pattern: math, bold (including escaped asterisks \*), italic, inline code, links
  const tokenRegex = /(\$[^$\n]+\$|\*\*(?:[^*]|\\[*])+\*\*|\*(?:[^*]|\\[*])+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline KaTeX math: $formula$
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const formula = part.slice(1, -1);
      return (
        <span
          key={idx}
          className="font-serif inline-block mx-0.5 text-ink-950 dark:text-paper-50"
          dangerouslySetInnerHTML={{ __html: renderKaTeX(formula, false) }}
        />
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const innerText = part.slice(2, -2).replace(/\\\*/g, '*');
      return (
        <strong key={idx} className="font-semibold text-ink-950 dark:text-paper-50">
          {renderInlineMarkdown(innerText)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const innerText = part.slice(1, -1).replace(/\\\*/g, '*');
      return (
        <em key={idx} className="italic text-ink-800 dark:text-paper-200">
          {renderInlineMarkdown(innerText)}
        </em>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeVal = part.slice(1, -1);
      
      // If code block contains long explanations/sentences (e.g. accidentally wrapped descriptions),
      // render as clean, readable text instead of a cramped tiny badge box.
      const wordCount = codeVal.trim().split(/\s+/).length;
      const isSentence = codeVal.length > 45 || wordCount > 5;

      if (isSentence) {
        return (
          <span
            key={idx}
            className="text-ink-850 dark:text-paper-150 font-sans leading-relaxed"
          >
            {codeVal}
          </span>
        );
      }

      // Standard short technical token / parameter / filename
      return (
        <code
          key={idx}
          className="font-mono text-[0.88em] px-1.5 py-0.5 rounded bg-paper-200/70 dark:bg-paper-800/80 text-ink-900 dark:text-paper-100 border border-paper-300/70 dark:border-paper-700/70 mx-0.5 font-medium"
        >
          {codeVal}
        </code>
      );
    }

    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const rawUrl = linkMatch[2].trim();
      // Security: Disallow javascript:, data:, vbscript: protocols to prevent XSS
      const isDangerous = /^(javascript|data|vbscript):/i.test(rawUrl);
      const safeHref = isDangerous ? '#' : rawUrl;

      return (
        <a
          key={idx}
          href={safeHref}
          target={safeHref.startsWith('http') ? '_blank' : undefined}
          rel={safeHref.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-tactical-blue dark:text-blue-400 underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Default plain text - also clean any remaining escaped asterisks
    const cleanedText = part.replace(/\\\*/g, '*');
    return <React.Fragment key={idx}>{cleanedText}</React.Fragment>;
  });
}
