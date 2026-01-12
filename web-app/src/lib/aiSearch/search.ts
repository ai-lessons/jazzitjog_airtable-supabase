// web-app/src/lib/aiSearch/search.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type AiSearchEvidence = {
  source_link: string;
  preview: string;
  dist: number;
};

export type AiSearchResult = {
  id_model: string;
  brand_canon: string;
  model_canon: string;
  best_dist: number;
  matched_chunks: number;
  distinct_sources: number;
  evidence: AiSearchEvidence[];
};

export type AiSearchResponse = {
  query: string;
  provider: "local" | "remote";
  results: AiSearchResult[];
  // Optional debug fields for multilingual support
  query_lang?: string;
  retrieval_queries?: Array<{ lang: string; text: string; used_translation: boolean }>;
};

export type AiSearchOptions = {
  topModels?: number; // default 10
  evidencePerModel?: number; // default 3
  kChunks?: number; // default (db function default)
};

type RpcRow = {
  brand_canon: string;
  model_canon: string;
  id_model: string;
  best_dist: number;
  matched_chunks: number;
  distinct_sources: number;
  evidence: AiSearchEvidence[] | null;
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function getProvider(): "local" | "remote" {
  const v = (process.env.AI_SEARCH_PROVIDER || "local").toLowerCase();
  return v === "remote" ? "remote" : "local";
}

function getTranslationEnabled(): boolean {
  const v = (process.env.AI_QUERY_TRANSLATION || "on").toLowerCase();
  return v !== "off";
}

function getTranslationTarget(): string {
  return process.env.AI_QUERY_TRANSLATION_TARGET || "en";
}

function getTranslateModel(): string {
  return process.env.TRANSLATE_MODEL || "gpt-4o-mini";
}

/**
 * Simple language detection heuristic:
 * - Contains Cyrillic characters => 'ru'
 * - Otherwise => 'en' (treat 'unknown' as 'en' per requirements)
 */
function detectLanguage(text: string): string {
  const cyrillicRegex = /[\u0400-\u04FF\u0500-\u052F]/;
  return cyrillicRegex.test(text) ? "ru" : "en";
}

async function translateQuery(
  query: string,
  targetLang: string = "en"
): Promise<string> {
  const apiKey = getEnv("OPENAI_API_KEY");
  const model = getTranslateModel();

  const prompt = `Translate to English for running shoe search. Keep brand names, model names, numbers, and abbreviations unchanged.

Query: ${query}

Translated query (English):`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a translation assistant specialized in running shoe terminology. Always preserve brand names (Nike, Adidas, etc.), model names (Pegasus, Ultraboost), numbers, and abbreviations exactly as they appear.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI translation failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as any;
  const translated = json?.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    throw new Error("OpenAI translation returned empty result");
  }

  return translated;
}

function makeSupabaseAdminClient(): SupabaseClient {
  // Use service role on the server only (API route / server runtime).
  const url = getEnv("SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!key) {
    throw new Error(
      "Missing Supabase service key. Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SERVICE_KEY."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function embedQueryOpenAI(text: string): Promise<number[]> {
  const apiKey = getEnv("OPENAI_API_KEY");
  const model = process.env.EMBED_MODEL || "text-embedding-3-small";

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      // We store vector(1536) in DB. text-embedding-3-small is 1536 by default.
      // If you later switch provider/model, keep DB + function in sync.
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as any;
  const vec = json?.data?.[0]?.embedding as number[] | undefined;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("OpenAI embeddings returned no vector");
  }
  return vec;
}

// pgvector accepts string like: "[0.1,0.2,...]"
function vectorToPgvectorLiteral(vec: number[]): string {
  // Keep it compact; Postgres parses this format for `vector`
  return `[${vec.join(",")}]`;
}

function mergeResults(
  ruResults: AiSearchResult[],
  enResults: AiSearchResult[],
  evidencePerModel: number
): AiSearchResult[] {
  const mergedById = new Map<string, AiSearchResult>();

  function processResult(result: AiSearchResult) {
    const existing = mergedById.get(result.id_model);
    if (!existing) {
      mergedById.set(result.id_model, { ...result });
      return;
    }

    // Keep the best (smallest) best_dist
    if (result.best_dist < existing.best_dist) {
      existing.best_dist = result.best_dist;
    }

    // Sum matched_chunks
    existing.matched_chunks += result.matched_chunks;

    // Combine evidence arrays
    const allEvidence = [...existing.evidence, ...result.evidence];

    // Deduplicate by source_link, keeping the one with smallest dist
    const evidenceBySource = new Map<string, AiSearchEvidence>();
    for (const ev of allEvidence) {
      const existingEv = evidenceBySource.get(ev.source_link);
      if (!existingEv || ev.dist < existingEv.dist) {
        evidenceBySource.set(ev.source_link, ev);
      }
    }

    // Convert back to array, sort by dist, and limit
    const sortedEvidence = Array.from(evidenceBySource.values())
      .sort((a, b) => a.dist - b.dist)
      .slice(0, evidencePerModel);

    existing.evidence = sortedEvidence;
    existing.distinct_sources = evidenceBySource.size;
  }

  ruResults.forEach(processResult);
  enResults.forEach(processResult);

  return Array.from(mergedById.values()).sort((a, b) => a.best_dist - b.best_dist);
}

async function aiSearchLocal(
  query: string,
  opts: AiSearchOptions
): Promise<AiSearchResponse> {
  const supabase = makeSupabaseAdminClient();

  const detectedLang = detectLanguage(query);
  const translationEnabled = getTranslationEnabled();
  const translationTarget = getTranslationTarget();

  const retrievalQueries: Array<{ lang: string; text: string; used_translation: boolean }> = [];
  
  // Always embed original query
  retrievalQueries.push({ lang: detectedLang, text: query, used_translation: false });

  // Check if we need translation
  const shouldTranslate =
    detectedLang === "ru" &&
    translationEnabled &&
    translationTarget === "en";

  let translatedQuery: string | null = null;
  if (shouldTranslate) {
    try {
      translatedQuery = await translateQuery(query, translationTarget);
      retrievalQueries.push({ lang: translationTarget, text: translatedQuery, used_translation: true });
    } catch (error) {
      console.warn("Translation failed, falling back to original query only:", error);
      // Continue with original query only
    }
  }

  const topModels = opts.topModels ?? 10;
  const evidencePerModel = opts.evidencePerModel ?? 3;

  async function callRpcWithQuery(queryText: string): Promise<AiSearchResult[]> {
    const qEmbedding = await embedQueryOpenAI(queryText);
    const q = vectorToPgvectorLiteral(qEmbedding);

    const payload: Record<string, any> = {
      q,
      top_models: topModels,
      evidence_per_model: evidencePerModel,
    };
    if (typeof opts.kChunks === "number") payload.k_chunks = opts.kChunks;

    const { data, error } = await supabase.rpc(
      "ai_match_models_with_evidence",
      payload
    );

    if (error) {
      throw new Error(
        `Supabase RPC ai_match_models_with_evidence failed: ${error.message}`
      );
    }

    const rows = (data || []) as RpcRow[];

    return rows.map((r) => ({
      id_model: r.id_model,
      brand_canon: r.brand_canon,
      model_canon: r.model_canon,
      best_dist: Number(r.best_dist),
      matched_chunks: Number(r.matched_chunks),
      distinct_sources: Number(r.distinct_sources),
      evidence: (r.evidence || []).map((e) => ({
        source_link: e.source_link,
        preview: e.preview,
        dist: Number(e.dist),
      })),
    }));
  }

  // Call RPC for original query
  const ruResults = await callRpcWithQuery(query);

  // Call RPC for translated query if available
  let enResults: AiSearchResult[] = [];
  if (translatedQuery) {
    enResults = await callRpcWithQuery(translatedQuery);
  }

  // Merge results if we have both Russian and English queries
  const finalResults =
    translatedQuery && enResults.length > 0
      ? mergeResults(ruResults, enResults, evidencePerModel)
      : ruResults;

  // Limit to topModels
  const limitedResults = finalResults.slice(0, topModels);

  const response: AiSearchResponse = {
    query,
    provider: "local",
    results: limitedResults,
    query_lang: detectedLang,
    retrieval_queries: retrievalQueries,
  };

  return response;
}

async function aiSearchRemote(
  query: string,
  opts: AiSearchOptions
): Promise<AiSearchResponse> {
  const baseUrl = getEnv("AI_SEARCH_REMOTE_URL"); // e.g. https://api.example.com
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/ai-search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, ...opts }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Remote AI search failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as AiSearchResponse;
  return { ...json, provider: "remote" };
}

/**
 * Main entry: keeps UI stable.
 * - Today: "local" (OpenAI + Supabase RPC) in Next.js API route.
 * - Later: flip AI_SEARCH_PROVIDER=remote and point AI_SEARCH_REMOTE_URL to backend (variant B).
 */
export async function aiSearch(
  query: string,
  opts: AiSearchOptions = {}
): Promise<AiSearchResponse> {
  const provider = getProvider();
  if (provider === "remote") return aiSearchRemote(query, opts);
  return aiSearchLocal(query, opts);
}

// Manual test note:
// Example RU query "мягкие кроссовки для асфальта" should execute 2 RPC calls when translation enabled.
