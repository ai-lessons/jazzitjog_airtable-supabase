import { ShoeResult } from '../db/upsertResults';
/**
 * Generate source_id for deduplication:
 * 1. Use article_id if available
 * 2. Else use normalized source_link
 * 3. Else use sha1(Content)
 */
export declare function generateSourceId(articleId?: string | null, sourceLink?: string | null, content?: string | null): string;
/**
 * Generate model_key for deduplication: lower(brand_name)::lower(model)
 */
export declare function generateModelKey(brandName: string, model: string): string;
/**
 * Merge two ShoeResult objects, preferring richer (non-null) values.
 * For weight: prefer grams over oz conversion approximations.
 * For drop: prefer explicit values over computed ones.
 */
export declare function mergeShoeResults(existing: ShoeResult, incoming: ShoeResult): ShoeResult;
/**
 * Check if a payload is strictly richer than another.
 * A payload is richer if it has more non-null fields or better values.
 */
export declare function isPayloadRicher(candidate: ShoeResult, existing: ShoeResult): boolean;
/**
 * Deduplicate models within a single document by model_key.
 * Merges duplicate models, preferring richer values.
 */
export declare function deduplicateInDocument(models: ShoeResult[]): ShoeResult[];
//# sourceMappingURL=deduplication.d.ts.map