import type { SneakerSpec, TitleAnalysis } from '../../llm/types';
/**
 * Input for extraction
 */
export type ExtractInput = {
    article_id: number;
    record_id?: string | null;
    title: string;
    content: string;
    date?: string | null;
    source_link?: string | null;
};
/**
 * Result of extraction
 */
export type ExtractResult = {
    article_id: number;
    sneakers: SneakerSpec[];
    extractionMethod: 'regex' | 'llm';
    titleAnalysis: TitleAnalysis;
    coverage?: ExtractCoverage;
};
/**
 * Coverage metrics for extraction quality
 */
export type ExtractCoverage = {
    totalSneakers: number;
    averageCoverage: number;
    fieldCoverage: Record<string, number>;
};
//# sourceMappingURL=types.d.ts.map