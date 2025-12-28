import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { z } from 'zod';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

// Configure logger
const logger = pino({
  level: 'info',
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
});

// Environment variables and defaults
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';
const resolverModel = process.env.RESOLVER_MODEL || 'gpt-4o-mini';
const resolverMaxTokens = parseInt(process.env.RESOLVER_MAX_TOKENS || '1000', 10);
const resolverBatchSize = parseInt(process.env.RESOLVER_BATCH_SIZE || '5', 10);
const forceResolve = process.env.FORCE_RESOLVE === 'true';

// LLM gate controls
const forceLlm = process.env.FORCE_LLM === '1';
const llmGateEnabled = process.env.LLM_GATE !== '0';
const llmMaxCalls = parseInt(process.env.LLM_MAX_CALLS || '200', 10);
let llmCallsUsed = 0;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Missing required environment variables SUPABASE_URL or SERVICE_KEY.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, serviceKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Zod schema for resolved single specs
const resolvedSingleSchema = z.object({
  mode: z.literal('resolved'),
  confidence: z.number().min(0).max(1),
  resolved: z.boolean().optional(),
  resolved_by: z.string().nullable().optional(),
  price_usd: z.number().nullable().optional(),
  weight_g: z.number().nullable().optional(),
  drop_mm: z.number().nullable().optional(),
  heel_mm: z.number().nullable().optional(),
  forefoot_mm: z.number().nullable().optional(),
  resolution_notes: z.string().optional(),
});

// Zod schema for resolved multi specs
const resolvedMultiSchema = z.object({
  mode: z.literal('resolved_multi'),
  confidence: z.number().min(0).max(1),
  resolved: z.boolean().optional(),
  resolved_by: z.string().nullable().optional(),
  models: z.array(z.object({
    model_name: z.string(),
    price_usd: z.number().nullable().optional(),
    weight_g: z.number().nullable().optional(),
    drop_mm: z.number().nullable().optional(),
    heel_mm: z.number().nullable().optional(),
    forefoot_mm: z.number().nullable().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })).optional(),
  resolution_notes: z.string().optional(),
});

// Zod schema for ambiguous multi (cannot confidently resolve)
const ambiguousMultiSchema = z.object({
  mode: z.literal('ambiguous_multi'),
  confidence: z.number().min(0).max(1).optional().nullable(),
  requires_llm_resolution: z.literal(true).optional(),
  resolution_failed_reason: z.string().optional(),
  resolution_notes: z.string().optional(),
  resolved_by: z.string().nullable().optional(),
});

// Union schema for validation
const resolvedSchema = z.union([resolvedSingleSchema, resolvedMultiSchema, ambiguousMultiSchema]);

// Helper to truncate snippets safely
function truncateSnippet(snippet: string, maxLength: number = 300): string {
  if (snippet.length <= maxLength) return snippet;
  return snippet.slice(0, maxLength) + '...';
}

// Build prompt for LLM
function buildPrompt(row: any): string {
  const articleTitle = row['Title'] || null;
  const url = row['Article link'] || 'Unknown URL';
  const specs = row.specs_json;

  // Extract candidate snippets safely and truncate
  const candidates = specs.candidates || {};
  const snippetKeys = [
    'price_snippets',
    'weight_snippets',
    'drop_snippets',
    'stack_snippets',
    'heel_snippets',
    'forefoot_snippets',
  ];

  let prompt = `You are an expert sneaker data extractor. Given the following article information, resolve the ambiguous specs into final normalized values.\n\n`;
  if (articleTitle) {
    prompt += `Article Title: ${articleTitle}\n`;
  }
  prompt += `Article URL: ${url}\n\n`;
  prompt += `Candidate snippets:\n`;

  for (const key of snippetKeys) {
    if (candidates[key] && Array.isArray(candidates[key])) {
      prompt += `- ${key}:\n`;
      for (const snippet of candidates[key]) {
        prompt += `  * ${truncateSnippet(snippet)}\n`;
      }
    }
  }

  prompt += `\nInstructions:\n`;
  prompt += `- Pick the specs that correspond to the main shoe being reviewed.\n`;
  prompt += `- Prefer values that appear together in the same snippet or table row.\n`;
  prompt += `- Convert oz to grams, inches to mm when necessary.\n`;
  prompt += `- If multiple candidates conflict, choose the one most likely to match the main model name.\n`;
  prompt += `- Return ONLY valid JSON. No markdown or code fences.\n`;
  prompt += `- Do NOT use newline characters in any string values. Use spaces instead.\n`;
  prompt += `- The JSON must match the schema:\n`;
  prompt += `  - For single model: mode: "resolved", confidence (0-1), resolved_by (string, optional), price_usd, weight_g, drop_mm, heel_mm, forefoot_mm, resolution_notes\n`;
  prompt += `  - For multiple models: mode: "resolved_multi", confidence (0-1), resolved_by (string, optional), models: [{ model_name, price_usd, weight_g, drop_mm, heel_mm, forefoot_mm, confidence }], resolution_notes\n`;
  prompt += `  - If unable to confidently resolve: mode: "ambiguous_multi", requires_llm_resolution: true, resolution_failed_reason (string), resolution_notes (string, optional), confidence (optional 0-1)\n`;
  prompt += `- If you cannot confidently resolve, return mode "ambiguous_multi" and include resolution_notes explaining why.\n`;

  return prompt;
}

// Parse and validate LLM response JSON
async function parseLLMResponse(rawText: string): Promise<any> {
  try {
    const repaired = jsonrepair(rawText);
    let parsed = JSON.parse(repaired);
    // If the model returned a quoted JSON string, unwrap it:
    if (typeof parsed === 'string') {
      const repaired2 = jsonrepair(parsed.trim());
      parsed = JSON.parse(repaired2);
    }
    logger.info({ parsedType: typeof parsed }, 'Parsed LLM response type in parseLLMResponse');
    const validated = resolvedSchema.parse(parsed);
    return validated;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ rawSnippet: rawText.slice(0, 200), repairedSnippet: errorMessage }, 'Invalid JSON or schema mismatch');
    throw new Error(`Invalid JSON or schema mismatch: ${errorMessage}`);
  }
}

// Normalize strings in output to remove newlines and trim
function normalizeString(str: string): string {
  return str.replace(/[\\r\\n]+/g, ' ').trim();
}

// Mark gate skip in specs_method and specs_json for a row
async function markGateSkip(id: number, reason: string, specs: any) {
  const now = new Date().toISOString();
  
  // Preserve existing specs_json and update with gate skip info
  const updatedSpecsJson = {
    ...specs,
    mode: 'llm_gate_skipped',
    gate_skip_reason: reason,
    gate_skipped_at: now,
    previous_mode: specs.mode || null,
    previous_requires_llm_resolution: specs.requires_llm_resolution || null,
  };
  
  const { error } = await supabase
    .from('JazzItJog_db')
    .update({
      specs_json: updatedSpecsJson,
      specs_extracted_at: now,
      specs_method: 'llm_gate_skip',
    })
    .eq('ID', id);

  if (error) {
    logger.error({ ID: id, error: error.message }, 'Failed to mark gate skip');
  }
}

// Check if row has enough signal to justify LLM call
function hasEnoughSignal(specs: any): boolean {
  const specFields = [
    specs.price_usd,
    specs.weight_g,
    specs.drop_mm,
    specs.heel_mm,
    specs.forefoot_mm
  ];
  const nonNullCount = specFields.filter(v => v !== null && v !== undefined && typeof v === 'number').length;
  return nonNullCount >= 2;
}

// Process a single row
async function processRow(row: any): Promise<void> {
  const id = row.ID;
  const specs = row.specs_json;

  // Allow processing of ambiguous_multi or llm_gate_skipped (if FORCE_LLM=1)
  if (!specs || (specs.mode !== 'ambiguous_multi' && specs.mode !== 'llm_gate_skipped')) {
    logger.info({ ID: id, mode: specs?.mode }, 'Skipping row: not ambiguous_multi or llm_gate_skipped mode');
    return;
  }

  if (!forceResolve && specs.resolved === true) {
    logger.info({ ID: id }, 'Skipping row: already resolved');
    return;
  }

  const promptVersion = 'v1';

  const prompt = buildPrompt(row);

  logger.info({ ID: id, step: 'llm_prompt_built' }, 'LLM prompt built');

  // LLM gate: check if we should call the LLM
  if (!forceLlm && llmGateEnabled) {
    // Check max calls limit
    if (llmCallsUsed >= llmMaxCalls) {
      logger.info({ ID: id, step: 'llm_gate_skip', reason: 'max_calls_exceeded', calls_used: llmCallsUsed, max_calls: llmMaxCalls }, 'LLM gate skip: max calls exceeded');
      await markGateSkip(id, 'max_calls_exceeded', specs);
      return;
    }

    // Check if row has enough signal (at least 2 non-null spec fields)
    if (!hasEnoughSignal(specs)) {
      logger.info({ ID: id, step: 'llm_gate_skip', reason: 'insufficient_signal' }, 'LLM gate skip: insufficient signal');
      await markGateSkip(id, 'insufficient_signal', specs);
      return;
    }

    // Check if candidates exist (prompt inputs)
    const candidates = specs.candidates || {};
    const hasCandidates = Object.keys(candidates).some(key => Array.isArray(candidates[key]) && candidates[key].length > 0);
    if (!hasCandidates) {
      logger.info({ ID: id, step: 'llm_gate_skip', reason: 'no_candidates' }, 'LLM gate skip: no candidates');
      await markGateSkip(id, 'no_candidates', specs);
      return;
    }
  }

  // Gate allows LLM call
  if (!forceLlm && llmGateEnabled) {
    logger.info({ ID: id, step: 'llm_gate_allow', reason: 'passed_checks' }, 'LLM gate allow');
  }
  llmCallsUsed++;

  let responseText: string;
  try {
    const completion = await openai.chat.completions.create({
      model: resolverModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: resolverMaxTokens,
      temperature: 0,
      response_format: { type: "json_object" }
    });
    responseText = completion.choices[0].message?.content || '';
  } catch (err) {
    logger.error({ ID: id, error: err }, 'LLM call failed');
    await markFailure(id, `LLM call failed: ${err}`, specs);
    return;
  }

  // Try parse and validate
  let parsedJson: any;
  try {
    const raw = String(responseText ?? '').trim();
    const repaired1 = jsonrepair(raw);
    let parsed1 = JSON.parse(repaired1);
    
    // If the model returned a quoted JSON string, unwrap it:
    if (typeof parsed1 === 'string') {
      const repaired2 = jsonrepair(parsed1.trim());
      parsed1 = JSON.parse(repaired2);
    }
    
    logger.info({ ID: id, parsedType: typeof parsed1 }, 'Parsed LLM response type');
    const validated = resolvedSchema.parse(parsed1);

    // Normalize strings to remove newlines and trim
    if (validated.resolved_by && typeof validated.resolved_by === 'string') {
      validated.resolved_by = normalizeString(validated.resolved_by);
    }
    if (validated.resolution_notes && typeof validated.resolution_notes === 'string') {
      validated.resolution_notes = normalizeString(validated.resolution_notes);
    }
    if (validated.mode === 'resolved_multi' && validated.models && Array.isArray(validated.models)) {
      for (const model of validated.models) {
        if (typeof model.model_name === 'string') {
          model.model_name = normalizeString(model.model_name);
        }
      }
    }
    parsedJson = validated;
  } catch (err) {
    logger.error({ ID: id, error: err, rawSnippet: (responseText || '').slice(0, 200) }, 'JSON parse failed');
    await markFailure(id, `JSON parse failed: ${err}`, specs);
    return;
  }

  // If mode is ambiguous_multi, ensure required fields
  if (parsedJson.mode === 'ambiguous_multi') {
    parsedJson.requires_llm_resolution = true;
    if (!parsedJson.resolution_failed_reason) {
      parsedJson.resolution_failed_reason = 'llm_returned_ambiguous';
    }
  }

    // Prepare update object (MERGE, do not overwrite)
  const mergedSpecsJson: any = {
    ...(specs ?? {}),
    ...(parsedJson ?? {}),
    resolved_by_meta: {
      model: resolverModel,
      prompt_version: promptVersion,
      timestamp: new Date().toISOString(),
    },
    telemetry: {
      ...(specs?.telemetry ?? {}),
      ...(parsedJson as any)?.telemetry,
      snippets_provided: Object.fromEntries(
        Object.entries((specs as any)?.candidates || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
      prompt_tokens_approx: prompt.length / 4, // rough estimate
    },
  };

  const updateObj: any = {
    specs_json: mergedSpecsJson,
    specs_extracted_at: new Date().toISOString(),
    specs_method: 'llm_resolver',
  };


  // Update row in Supabase
  const { error } = await supabase
    .from('JazzItJog_db')
    .update(updateObj)
    .eq('ID', id);

  if (error) {
    logger.error({ ID: id, error: error.message }, 'Failed to update resolved specs');
  } else {
    logger.info({ ID: id, step: 'row_updated' }, 'Row updated with resolved specs');
  }
}

// Mark failure in specs_json for a row
async function markFailure(id: number, reason: string, existingSpecsJson: any) {
  const failurePatch = {
    mode: 'ambiguous_multi',
    requires_llm_resolution: true,
    resolution_failed_reason: reason,
  };
  
  const merged = { ...(existingSpecsJson ?? {}), ...failurePatch };
  
  const { error } = await supabase
    .from('JazzItJog_db')
    .update({
      specs_json: merged,
      specs_extracted_at: new Date().toISOString(),
      specs_method: 'llm_resolver_failure',
    })
    .eq('ID', id);

  if (error) {
    logger.error({ ID: id, error: error.message }, 'Failed to mark failure in specs_json');
  } else {
    logger.info({ ID: id, step: 'failure_marked' }, 'Marked failure in specs_json');
  }
}

// Retry helper for Supabase fetch with exponential backoff and jitter
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 5,
  baseDelay = 500,
  timeoutMs = 15000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      // Wrap the operation to support abort signal if needed
      // (Supabase doesn't use AbortController directly, but we can pass it in fetch options if we had custom fetch)
      // For now, we just call the operation and rely on the timeout to throw.
      // We'll use Promise.race to implement timeout.
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // Check if error is a network error we should retry
      const isNetworkError =
        err.name === 'TypeError' && err.message.includes('fetch') ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'EAI_AGAIN' ||
        err.cause?.code === 'ETIMEDOUT' ||
        err.cause?.code === 'ECONNRESET' ||
        err.message?.includes('fetch failed') ||
        err.message?.includes('network') ||
        err.message?.includes('connection');

      if (!isNetworkError || attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 250;
      logger.warn({
        attempt,
        maxAttempts,
        delay: Math.round(delay),
        error: err.message,
        errorName: err.name,
        errorCode: err.code,
        errorCause: err.cause,
        step: 'retry_attempt',
      }, 'Network error, retrying');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we exit the loop, all retries failed
  const finalError = new Error(`Operation failed after ${maxAttempts} attempts: ${lastError?.message || lastError}`);
  (finalError as any).cause = lastError;
  throw finalError;
}

// Helper to fetch a batch with retry
async function fetchBatchWithRetry(cursor: number, batchNumber: number): Promise<any> {
  // Base filter: ambiguous_multi or resolution_failed_reason not null
  let orFilter = 'specs_json->>mode.eq.ambiguous_multi,specs_json->>resolution_failed_reason.not.is.null';
  
  // If FORCE_LLM=1, also include llm_gate_skipped rows
  if (forceLlm) {
    orFilter += ',specs_json->>mode.eq.llm_gate_skipped';
  }
  
  const selectString = 'ID, "Article link", "Title", specs_json';

  const fetchOperation = async () => {
    const { data, error } = await supabase
      .from('JazzItJog_db')
      .select(selectString)
      .or(orFilter)
      .order('ID', { ascending: true })
      .gt('ID', cursor)
      .limit(resolverBatchSize);

    if (error) {
      const err = new Error(`Supabase query error: ${error.message}`);
      (err as any).code = error.code;
      (err as any).details = error.details;
      (err as any).hint = error.hint;
      throw err;
    }
    return { data, error: null };
  };

  return withRetry(fetchOperation, 5, 500, 15000);
}

// Main processing loop with pagination
const debugRunnerRaw = (process.env.DEBUG_RUNNER || '').trim().toLowerCase();
const isDebug = ['1','true','yes'].includes(debugRunnerRaw);

const resolverLimit = parseInt(process.env.RESOLVER_LIMIT || '0', 10);

async function main() {
  let cursor = 0;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (true) {
    if (resolverLimit > 0 && totalProcessed >= resolverLimit) {
      logger.info({
        step: 'limit_reached',
        resolver_limit: resolverLimit,
        total_processed: totalProcessed
      }, 'Resolver limit reached, stopping early');
      break;
    }

    batchNumber++;
    let orFilter = 'specs_json->>mode.eq.ambiguous_multi,specs_json->>resolution_failed_reason.not.is.null';

    if (forceLlm) {
      orFilter += ',specs_json->>mode.eq.llm_gate_skipped';
    }


    if (isDebug) {
      logger.debug({ batch: batchNumber, orFilter }, 'Using .or() filter for ambiguous_multi fetch');
    }
    const selectString = 'ID, "Article link", "Title", specs_json';
    if (isDebug) {
      logger.info({ selectString }, 'Supabase select string used for ambiguous_multi fetch');
    }

    let data;
    try {
      const result = await fetchBatchWithRetry(cursor, batchNumber);
      data = result.data;
    } catch (err: any) {
      logger.error({
        error: err.message,
        errorName: err.name,
        errorCode: err.code,
        errorCause: err.cause,
        batch: batchNumber,
        step: 'supabase_fetch_failed_after_retries'
      }, 'Failed to fetch batch after all retries');
      break;
    }

    if (!data || data.length === 0) {
      logger.info({ step: 'no_more_rows', batch: batchNumber - 1, total_processed: totalProcessed }, 'No more ambiguous_multi rows to process');
      break;
    }

    logger.info({ step: 'batch_start', batch: batchNumber, batch_size: data.length }, `Processing batch ${batchNumber} with ${data.length} rows`);

    for (const row of data) {
      await processRow(row);
      cursor = row.ID;
      totalProcessed++;
    }
  }

  logger.info({ step: 'resolver_complete', total_processed: totalProcessed }, 'Ambiguous specs resolver completed');
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, 'Resolver script failed');
    process.exit(1);
  });
}

export default main;
