import type { TitleAnalysis } from './types';
/**
 * Base system prompt for sneaker extraction
 */
export declare const BASE_SYSTEM_PROMPT: string;
/**
 * Few-shot examples for better extraction quality
 */
export declare const FEW_SHOT_EXAMPLES: string;
/**
 * Generate system prompt based on title analysis
 */
export declare function generateSystemPrompt(titleAnalysis?: TitleAnalysis): string;
/**
 * Generate user prompt for extraction
 */
export declare function generateUserPrompt(content: string, title?: string, titleAnalysis?: TitleAnalysis): string;
//# sourceMappingURL=prompts.d.ts.map