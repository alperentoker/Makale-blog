export type PublicationStatus = 'draft' | 'under_review' | 'published';

export interface Author {
  name: string;
  affiliation: string;
  role?: string;
  email?: string;
  orcid?: string;
}

export interface ArticleSeries {
  id: string;
  name: string;
  phase: string;
  stepNumber: number;
  totalSteps: number;
}

export interface TableData {
  id: string;
  title: string;
  description?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface BeforeAfterMedia {
  beforeUrl: string;
  beforeLabel: string;
  afterUrl: string;
  afterLabel: string;
  caption: string;
}

export interface ArticleTelemetry {
  latency?: string;      // e.g. "6.5 ms"
  fps?: number | string; // e.g. "153 FPS"
  resolution?: string;   // e.g. "640×512 LWIR"
  sensor?: string;       // e.g. "FLIR Boson VOx 14-Bit"
  modelArch?: string;    // e.g. "YOLOv9-C" or "YOLO11s"
  accuracy?: string;     // e.g. "mAP@50: 89.4%"
  hardware?: string;     // e.g. "Jetson Orin AGX"
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  dek: string; // Subtitle / editorial dek
  abstract: string;
  authors: Author[];
  date: string; // ISO date string: YYYY-MM-DD
  displayDate: string; // Formatted date e.g. "22 Eylül 2026"
  readingTime: string; // e.g. "9 dk okuma süresi"
  version: string; // e.g. "v1.2 - Sızıntısız Split Güncellemesi"
  category: 'Termal Görüntüleme' | 'Veri Mühendisliği' | 'Kenar Yapay Zeka' | 'Edge AI' | (string & {});
  tags: string[];
  series?: ArticleSeries;
  status: PublicationStatus;
  content: string; // Markdown body with frontmatter and KaTeX
  bibtex: string;
  doi?: string;
  keywords?: string[];
  beforeAfterMedia?: BeforeAfterMedia;
  tables?: TableData[];
  telemetry?: ArticleTelemetry;
  searchSnippet?: string;
}

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}
