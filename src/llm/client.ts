// OpenAI client setup and configuration

import OpenAI from 'openai';
import { logger } from '../core/logger';
import PQueue from 'p-queue';
import { createHash } from 'crypto';

let cachedClient: OpenAI | null = null;
const llmQueue = new PQueue({ concurrency: parseInt(process.env.OPENAI_CONCURRENCY || '2', 10) || 2 });
const CACHE_TTL_MS = parseInt(process.env.OPENAI_CACHE_TTL_MS || '86400000', 10) || 86400000; // 24h
const responseCache = new Map<string, { ts: number; value: string }>();

function cacheKey(model: string, systemPrompt: string, userPrompt: string, fewShot?: string): string {
  const h = createHash('sha256');
  h.update(model);
  h.update('\n--SYS--\n');
  h.update(systemPrompt);
  if (fewShot) { h.update('\n--FEW--\n'); h.update(fewShot); }
  h.update('\n--USR--\n');
  h.update(userPrompt);
  return h.digest('hex');
}

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

  const key = cacheKey(model, systemPrompt, userPrompt, fewShotExamples);
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    logger.debug('OpenAI cache hit');
    return cached.value;
  }

  const task: () => Promise<string> = async () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (fewShotExamples) {
      messages.push({ role: 'user', content: fewShotExamples });
    }

    messages.push({ role: 'user', content: userPrompt });

    // simple retry with backoff for rate limits
    const delays = [500, 1500, 3500];
    let lastErr: any = null;
    for (let attempt = 0; attempt < delays.length + 1; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response from OpenAI');

        logger.info('OpenAI API call successful', {
          model,
          tokens: response.usage?.total_tokens || 0,
        });

        responseCache.set(key, { ts: Date.now(), value: content });
        return content;
      } catch (err: any) {
        lastErr = err;
        const isRate = (err?.status === 429) || /rate limit/i.test(String(err?.message || ''));
        if (attempt < delays.length && isRate) {
          const wait = delays[attempt];
          logger.warn('OpenAI rate limit hit, backing off', { waitMs: wait, attempt: attempt + 1 });
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        break;
      }
    }
    logger.error('OpenAI API call failed', { error: lastErr });
    console.error('OpenAI API error:', lastErr instanceof Error ? lastErr.message : lastErr);
    throw lastErr;
  };

  const result = await llmQueue.add(task as () => Promise<string>);
  return result as string;
}
