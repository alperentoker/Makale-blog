import { Article } from '../types';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://lens.104.199.0.148.nip.io';
};

export function generateBibtex(article: Article): string {
  const firstAuthorLastName = article.authors[0]?.name.split(' ').pop() || 'author';
  const year = article.date.split('-')[0] || '2026';
  const key = `${firstAuthorLastName.toLowerCase()}${year}${article.slug.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`;

  const authorsString = article.authors.map(a => a.name).join(' and ');
  const baseUrl = getBaseUrl();

  return `@article{${key},
  author    = {${authorsString}},
  title     = {${article.title}},
  journal   = {LENS: Mühendislik ve Araştırma Notları},
  year      = {${year}},
  url       = {${baseUrl}/makale/${article.slug}}
}`;
}

export function generateIeeeCitation(article: Article): string {
  const authorText = article.authors.map(a => {
    const parts = a.name.split(' ');
    if (parts.length > 1) {
      const firstInitials = parts.slice(0, -1).map(p => p[0] + '.').join(' ');
      return `${firstInitials} ${parts[parts.length - 1]}`;
    }
    return a.name;
  }).join(', ');

  const year = article.date.split('-')[0] || '2026';
  const baseUrl = getBaseUrl();
  return `${authorText}, "${article.title}," LENS Mühendislik ve Araştırma Notları, ${article.displayDate || year}. URL: ${baseUrl}/makale/${article.slug}`;
}

export function generateApaCitation(article: Article): string {
  const authorText = article.authors.map(a => {
    const parts = a.name.split(' ');
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      const initials = parts.slice(0, -1).map(p => p[0] + '.').join(' ');
      return `${lastName}, ${initials}`;
    }
    return a.name;
  }).join(', ');

  const year = article.date.split('-')[0] || '2026';
  const baseUrl = getBaseUrl();
  return `${authorText} (${year}). ${article.title}. LENS Mühendislik ve Araştırma Notları. ${baseUrl}/makale/${article.slug}`;
}
