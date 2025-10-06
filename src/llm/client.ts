// OpenAI client setup and configuration

import OpenAI from 'openai';
import { logger } from '../core/logger';

let cachedClient: OpenAI | null = null;

/**
 * Create OpenAI client
 */
export function createOpenAIClient(apiKey: string): OpenAI {
  logger.debug('Creating OpenAI client');

  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const client = new OpenAI({
    apiKey,
    maxRetries: 3,
    timeout: 60000, // 60 seconds
  });

  logger.info('OpenAI client created successfully');
  return client;
}

/**
 * Get or create cached OpenAI client
 */
export function getOpenAIClient(apiKey: string): OpenAI {
  if (!cachedClient) {
    cachedClient = createOpenAIClient(apiKey);
  }
  return cachedClient;
}

/**
 * Reset cached client (useful for testing or API key changes)
 */
export function resetOpenAIClient(): void {
  cachedClient = null;
  logger.debug('OpenAI client cache cleared');
}

/**
 * Default model configuration
 */
export const DEFAULT_MODEL = 'gpt-4o-mini';
export const DEFAULT_TEMPERATURE = 0;
export const DEFAULT_MAX_TOKENS = 4000;

/**
 * Call OpenAI chat completion with structured output
 */
export async function callOpenAI(
  client: OpenAI,
  options: {
    systemPrompt: string;
    userPrompt: string;
    fewShotExamples?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    fewShotExamples,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  logger.debug('Calling OpenAI API', { model, temperature });

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
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

    logger.info('OpenAI API call successful', {
      model,
      tokens: response.usage?.total_tokens || 0,
    });

    return content;
  } catch (error) {
    logger.error('OpenAI API call failed', { error });
    console.error('OpenAI API error:', error instanceof Error ? error.message : error);
    throw error;
  }
}
