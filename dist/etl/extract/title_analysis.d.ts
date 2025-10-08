import type { TitleAnalysis } from '../../llm/types';
/**
 * Two-stage filtering: Title → Content
 * Returns true if article is about running shoes
 */
export declare function isRunningShoeArticle(title: string, content?: string): boolean;
/**
 * Analyze article title to determine extraction context
 * NOTE: This is called AFTER isRunningShoeArticle() confirms it's a shoe article
 */
export declare function analyzeTitleForContext(title: string): TitleAnalysis;
/**
 * Check if sneaker matches title analysis
 */
export declare function matchesTitleAnalysis(sneaker: {
    brand_name: string | null;
    model: string | null;
}, analysis: TitleAnalysis): boolean;
//# sourceMappingURL=title_analysis.d.ts.map