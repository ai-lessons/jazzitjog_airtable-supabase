import type { SneakerSpec, ExtractionOptions } from './types';
/**
 * Extract sneakers using LLM (GPT-4o-mini)
 */
export declare function extractWithLLM(apiKey: string, content: string, title?: string, options?: ExtractionOptions): Promise<SneakerSpec[]>;
//# sourceMappingURL=extract_llm.d.ts.map