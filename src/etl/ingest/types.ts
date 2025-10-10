// Ingest types

export type IngestArticle = {
  article_id: number;
  airtable_id: string; // Airtable record ID (renamed from record_id)
  title: string;
  content: string;
  date?: string | null;
  source_link?: string | null;
};

export type IngestResult = {
  articles: IngestArticle[];
  total: number;
  skipped: number;
  errors: string[];
};

export type IngestOptions = {
  maxRecords?: number;
  view?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
};
