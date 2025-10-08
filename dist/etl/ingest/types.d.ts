export type IngestArticle = {
    article_id: number;
    record_id: string;
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
    sort?: Array<{
        field: string;
        direction: 'asc' | 'desc';
    }>;
};
//# sourceMappingURL=types.d.ts.map