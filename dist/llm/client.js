"use strict";
// OpenAI client setup and configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_TOKENS = exports.DEFAULT_TEMPERATURE = exports.DEFAULT_MODEL = void 0;
exports.createOpenAIClient = createOpenAIClient;
exports.getOpenAIClient = getOpenAIClient;
exports.resetOpenAIClient = resetOpenAIClient;
exports.callOpenAI = callOpenAI;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../core/logger");
let cachedClient = null;
/**
 * Create OpenAI client
 */
function createOpenAIClient(apiKey) {
    logger_1.logger.debug('Creating OpenAI client');
    if (!apiKey) {
        throw new Error('OpenAI API key is required');
    }
    const client = new openai_1.default({
        apiKey,
        maxRetries: 3,
        timeout: 60000, // 60 seconds
    });
    logger_1.logger.info('OpenAI client created successfully');
    return client;
}
/**
 * Get or create cached OpenAI client
 */
function getOpenAIClient(apiKey) {
    if (!cachedClient) {
        cachedClient = createOpenAIClient(apiKey);
    }
    return cachedClient;
}
/**
 * Reset cached client (useful for testing or API key changes)
 */
function resetOpenAIClient() {
    cachedClient = null;
    logger_1.logger.debug('OpenAI client cache cleared');
}
/**
 * Default model configuration
 */
exports.DEFAULT_MODEL = 'gpt-4o-mini';
exports.DEFAULT_TEMPERATURE = 0;
exports.DEFAULT_MAX_TOKENS = 4000;
/**
 * Call OpenAI chat completion with structured output
 */
async function callOpenAI(client, options) {
    const { systemPrompt, userPrompt, fewShotExamples, model = exports.DEFAULT_MODEL, temperature = exports.DEFAULT_TEMPERATURE, maxTokens = exports.DEFAULT_MAX_TOKENS, } = options;
    logger_1.logger.debug('Calling OpenAI API', { model, temperature });
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
        ];
        if (fewShotExamples) {
            messages.push({ role: 'user', content: fewShotExamples });
        }
        messages.push({ role: 'user', content: userPrompt });
        const response = await client.chat.completions.create({
            model,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }
        logger_1.logger.info('OpenAI API call successful', {
            model,
            tokens: response.usage?.total_tokens || 0,
        });
        return content;
    }
    catch (error) {
        logger_1.logger.error('OpenAI API call failed', { error });
        console.error('OpenAI API error:', error instanceof Error ? error.message : error);
        throw error;
    }
}
//# sourceMappingURL=client.js.map