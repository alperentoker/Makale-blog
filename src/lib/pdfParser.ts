import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source for pdfjs-dist locally
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface IngestedDocument {
  title: string;
  dek?: string;
  abstract: string;
  authors: Array<{ name: string; affiliation: string }>;
  date: string;
  category: 'Termal Görüntüleme' | 'Veri Mühendisliği' | 'Kenar Yapay Zeka' | 'Edge AI';
  tags: string[];
  content: string;
  pageCount: number;
}

export async function parsePdfFile(file: File): Promise<IngestedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';
  const pageTexts: string[] = [];

  for (let i = 1; i <= Math.min(numPages, 10); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    pageTexts.push(pageStr);
    fullText += pageStr + '\n\n';
  }

  // Heuristics for metadata extraction
  const firstPage = pageTexts[0] || '';
  
  // Extract title: first prominent sentence or words before Abstract/Özet
  let title = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  const abstractMatch = firstPage.match(/(?:Özet|Abstract)[:\s]([\s\S]*?)(?=(?:1\.?\s*Giriş|1\.?\s*Introduction|Anahtar Kelimeler|Keywords|$))/i);
  const keywordsMatch = firstPage.match(/(?:Anahtar Kelimeler|Keywords)[:\s]([\s\S]*?)(?=(?:1\.?\s*Giriş|1\.?\s*Introduction|$))/i);

  let abstract = '';
  if (abstractMatch && abstractMatch[1]) {
    abstract = abstractMatch[1].trim().slice(0, 600);
  } else {
    abstract = firstPage.slice(0, 300).trim() + '...';
  }

  let tags = ['Savunma Sanayii', 'Bilgisayarlı Görü', 'Derin Teknoloji'];
  if (keywordsMatch && keywordsMatch[1]) {
    const extractedTags = keywordsMatch[1]
      .split(/[,;]/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && t.length < 30);
    if (extractedTags.length > 0) {
      tags = extractedTags;
    }
  }

  // Guess category
  let category: 'Termal Görüntüleme' | 'Veri Mühendisliği' | 'Kenar Yapay Zeka' | 'Edge AI' = 'Termal Görüntüleme';
  const lower = fullText.toLowerCase();
  if (lower.includes('termal') || lower.includes('flir') || lower.includes('kızılötesi') || lower.includes('lwir')) {
    category = 'Termal Görüntüleme';
  } else if (lower.includes('kenar') || lower.includes('jetson') || lower.includes('npu') || lower.includes('fp8')) {
    category = 'Kenar Yapay Zeka';
  } else if (lower.includes('veri sızıntısı') || lower.includes('k-fold') || lower.includes('split') || lower.includes('veri seti')) {
    category = 'Veri Mühendisliği';
  }

  // Markdown content generation from PDF text
  const cleanBody = `## 1. Giriş ve Problem Tanımı\n\n${pageTexts[0]?.slice(200, 1000) || 'Belge içeriği ayrıştırılıyor...'}\n\n## 2. Metodoloji ve Mimari\n\n${pageTexts[1]?.slice(0, 800) || 'Metodoloji detayları...'}\n\n## 3. Deneysel Sonuçlar ve Değerlendirme\n\n${pageTexts[2]?.slice(0, 800) || 'Deneysel sonuçlar...'}`;

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    dek: 'Otomatik içe aktarılan savunma ve mühendislik araştırma belgesi.',
    abstract,
    authors: [
      { name: 'Alperen Toker', affiliation: 'Yapay Zeka & Bilgisayarlı Görü' }
    ],
    date: new Date().toISOString().split('T')[0],
    category,
    tags,
    content: cleanBody,
    pageCount: numPages,
  };
}
