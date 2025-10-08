import OpenAI from 'openai';
/**
 * Create OpenAI client
 */
export declare function createOpenAIClient(apiKey: string): OpenAI;
/**
 * Get or create cached OpenAI client
 */
export declare function getOpenAIClient(apiKey: string): OpenAI;
/**
 * Reset cached client (useful for testing or API key changes)
 */
export declare function resetOpenAIClient(): void;
/**
 * Default model configuration
 */
export declare const DEFAULT_MODEL = "gpt-4o-mini";
export declare const DEFAULT_TEMPERATURE = 0;
export declare const DEFAULT_MAX_TOKENS = 4000;
/**
 * Call OpenAI chat completion with structured output
 */
export declare function callOpenAI(client: OpenAI, options: {
    systemPrompt: string;
    userPrompt: string;
    fewShotExamples?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}): Promise<string>;
//# sourceMappingURL=client.d.ts.map