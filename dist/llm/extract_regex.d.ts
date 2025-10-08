import type { SneakerSpec } from './types';
/**
 * Multi-model extractor for structured content with headings and descriptions.
 *
 * Approach:
 * 1. detectModelHeadings() - Find headings like "Best Road Running Shoes: Hoka Clifton 9 ($145)"
 * 2. collectModelBlock() - Extract description paragraph(s) after each heading
 * 3. extractSpecs() - Parse specs from the combined heading + description block
 * 4. normalizeSpecs() - Apply existing normalization rules
 *
 * Regex patterns:
 * - Heading: /(?:Best\s+)?(?:Road|Trail)?\s*(?:Running\s+)?Shoes?.*?:\s*([A-Z][^(]*?)(?:\s*\([^)]*\))?\s*$/gmi
 * - Price: /\(\s*\$?\s*(\d{2,4})\s*\)|\b\$?\s*(\d{2,4})\b/g
 * - Weight: /(\d+(?:\.\d+)?)\s*(?:ounces?|oz)\s*\((\d+)\s*grams?\)|(\d{2,4})\s*grams?|(\d+(?:\.\d+)?)\s*(?:ounces?|oz)/gi
 * - Heights: /(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*millimeters?|(\d+(?:\.\d+)?)\s*millimeters?\s*.*?(?:heel|forefoot|stack)/gi
 * - Drop: /(\d+(?:\.\d+)?)\s*millimeters?\s*drop/gi
 */
export interface HeadingMatch {
    heading: string;
    brandModel: string;
    price?: number;
    startIndex: number;
    endIndex: number;
}
export interface ModelBlock {
    heading: HeadingMatch;
    description: string;
    fullBlock: string;
}
export type ExtractedSpecs = SneakerSpec;
/**
 * Detect model headings in structured content
 */
export declare function detectModelHeadings(content: string): HeadingMatch[];
/**
 * Collect the description block for each heading
 */
export declare function collectModelBlock(content: string, heading: HeadingMatch, nextHeading?: HeadingMatch): string;
/**
 * Extract specs from a model block (heading + description)
 */
export declare function extractSpecs(block: string, heading: HeadingMatch): Partial<ExtractedSpecs>;
/**
 * Normalize specs using existing project rules
 */
export declare function normalizeSpecs(raw: Partial<ExtractedSpecs>): ExtractedSpecs;
/**
 * Extract sneakers using regex patterns (exported API)
 */
export declare function extractWithRegex(content: string): SneakerSpec[];
//# sourceMappingURL=extract_regex.d.ts.map