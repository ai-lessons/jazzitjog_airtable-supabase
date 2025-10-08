import type { ExtractInput, ExtractResult } from './types';
/**
 * Extract sneaker specifications from article
 *
 * Algorithm:
 * 1. Analyze title for context (specific/general/brand-only)
 * 2. Try regex extraction (fast, structured content)
 * 3. Fallback to LLM if regex returns empty
 * 4. Filter results by title analysis
 * 5. Validate and deduplicate
 * 6. Calculate coverage metrics
 */
export declare function extractFromArticle(article: ExtractInput, apiKey: string): Promise<ExtractResult>;
//# sourceMappingURL=orchestrator.d.ts.map