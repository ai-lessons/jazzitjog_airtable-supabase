import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import * as cheerio from 'cheerio';
import { URL } from 'node:url';
import fetch, { Request, RequestInfo, RequestInit, Response } from 'node-fetch';
import * as fs from 'node:fs';
import { Worker } from 'worker_threads';

// Stage tracking for error diagnostics
type Stage =
  | 'init'
  | 'title_prefilter'
  | 'fetch_html'
  | 'prefilter_lightweight'
  | 'size_guard'
  | 'dom_parse'
  | 'prefilter'
  | 'windowing'
  | 'extract'
  | 'supabase_update'
  | 'done';

// Stage heartbeat for runner timeout diagnostics - uses fs.writeSync for immediate flush
function emitStage(stage: string) {
  // Use fs.writeSync to file descriptor 1 (stdout) to avoid buffering issues
  try {
    fs.writeSync(1, `STAGE ${stage}\n`);
  } catch {
    // Fallback to process.stdout.write if fs.writeSync fails
    process.stdout.write(`STAGE ${stage}\n`);
  }
}

// Safe error message utility - strips HTML and truncates
function safeShortMessage(err: any): string {
  if (typeof err === 'string') {
    return err.replace(/\s+/g, ' ').substring(0, 120).trim();
  }
  if (err?.message) {
    return String(err.message).replace(/\s+/g, ' ').substring(0, 120).trim();
  }
  return String(err).replace(/\s+/g, ' ').substring(0, 120).trim();
}

// Configure logger
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

// Strict startup check for required environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  '';
const forceId = process.env.FORCE_ID ? parseInt(process.env.FORCE_ID, 10) : null;
const forceOverwrite = process.env.FORCE_OVERWRITE === '1';
const domParseTimeoutMs = parseInt(process.env.DOM_PARSE_TIMEOUT_MS || '5000', 10);
const supabaseFetchTimeoutMs = parseInt(process.env.SUPABASE_FETCH_TIMEOUT_MS || '15000', 10);
const maxExtractChars = parseInt(process.env.MAX_EXTRACT_CHARS || '200000', 10);
const maxPrefilterChars = parseInt(process.env.MAX_PREFILTER_CHARS || '160000', 10);
const minContentLen = parseInt(process.env.MIN_CONTENT_LEN || '2000', 10);

// Windowed extraction configuration
const MAX_WINDOW_TOTAL_CHARS = parseInt(process.env.MAX_WINDOW_TOTAL_CHARS || '120000', 10);
const WINDOW_RADIUS = parseInt(process.env.WINDOW_RADIUS || '4000', 10);

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Missing required environment variables.');
  console.error('Please ensure SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY are set in your .env file.');
  process.exit(1);
}

// Custom fetch with timeout for Supabase client
async function fetchWithTimeout(input: string | Request | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), supabaseFetchTimeoutMs);
  
  // Combine signals if init.signal exists
  let signal: AbortSignal;
  if (init?.signal) {
    // Create a combined abort controller
    const combinedController = new AbortController();
    
    // Abort combined controller when either signal aborts
    const abortHandler = () => combinedController.abort();
    controller.signal.addEventListener('abort', abortHandler);
    init.signal.addEventListener('abort', abortHandler);
    
    // Clean up listeners when either signal aborts
    combinedController.signal.addEventListener('abort', () => {
      controller.signal.removeEventListener('abort', abortHandler);
      if (init?.signal) {
        init.signal.removeEventListener('abort', abortHandler);
      }
    });
    
    signal = combinedController.signal;
  } else {
    signal = controller.signal;
  }
  
  const fetchOptions = {
    ...init,
    signal
  };
  
  try {
    // Convert URL to string if needed
    const inputStr = input instanceof URL ? input.toString() : input;
    const response = await fetch(inputStr, fetchOptions);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Currency conversion rates (fixed)
const CURRENCY_RATES = {
  USD: 1,
  EUR: 1.08,  // 1 EUR = 1.08 USD
  GBP: 1.25,  // 1 GBP = 1.25 USD
} as const;

// 1. SHOE ARTICLE PREFILTER
function isLikelyShoeArticle(text: string): { 
  ok: boolean; 
  score: number; 
  has_anchor: boolean;
  pos_hits: string[];
  neg_hits: string[];
} {
  const lowerText = text.toLowerCase();
  
  // Strong shoe anchor patterns - stricter definition
  function hasShoeAnchor(text: string): boolean {
    const patterns = [
      /heel[-\s]?to[-\s]?toe\s+drop/i,
      /\bdrop\b.{0,30}\b\d{1,2}\s*mm\b/i,
      /\b(heel)\b.{0,60}\b(forefoot)\b.{0,40}\b\d{1,2}\s*mm\b/i,
      /\bstack\s+height\b/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
  
  const hasAnchor = hasShoeAnchor(text);
  
  // Weight categories for positive keywords
  const POSITIVE_KEYWORDS = {
    // High-value shoe-specific terms (weight: 3)
    high: [
      'midsole', 'outsole', 'heel-to-toe drop', 'stack height', 'forefoot',
      'heel', 'toe box', 'lugs', 'running shoe', 'trail shoe', 'sneaker',
      'pronation', 'supination', 'neutral', 'stability', 'carbon plate',
      'waterproof', 'breathable', 'traction', 'grip', 'upper'
    ],
    // Medium-value shoe terms (weight: 2)
    medium: [
      'shoe', 'running', 'trail', 'sneaker', 'runner', 'jog', 'run',
      'athletic', 'footwear', 'cushion', 'sole'
    ],
    // Low-value generic terms (weight: 0.5)
    low: [
      'mm', 'oz', 'g', 'MSRP', '$', 'price', 'weight'
    ]
  };
  
  // Expanded negative keywords (non-shoe articles) - weight: -3 each
  const NEGATIVE_KEYWORDS = [
    'bike', 'cycling', 'ski', 'snowboard', 'jacket', 'pants', 'tee', 'shirt',
    'backpack', 'watch', 'gps', 'phone', 'headphones', 'nutrition', 'hotel',
    'recipe', 'cooking', 'travel', 'book', 'movie', 'music', 'software',
    'car', 'battery', 'charger', 'laptop', 'tablet', 'tv', 'television',
    'furniture', 'appliance', 'garden', 'tool', 'paint', 'fabric', 'poles',
    'tent', 'sleeping bag', 'camping', 'hiking', 'backpacking', 'fishing',
    'swimming', 'surfing', 'yoga', 'pilates', 'meditation', 'camera',
    'lens', 'drone', 'gaming', 'console', 'controller', 'keyboard', 'mouse'
  ];
  
  // CAP repetition to prevent inflation
  const POSITIVE_CAP_PER_TERM = 3;
  const NEGATIVE_CAP_PER_TERM = 3;
  
  // Collect hits
  const posHits: string[] = [];
  const negHits: string[] = [];
  let score = 0;
  
  // Check high-value terms with cap
  for (const term of POSITIVE_KEYWORDS.high) {
    const regex = new RegExp(`\\b${term.replace(/[-\\s]/g, '[-\\s]?')}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const cappedCount = Math.min(matches.length, POSITIVE_CAP_PER_TERM);
      score += cappedCount * 3;
      posHits.push(`${term} (raw: ${matches.length}, capped: ${cappedCount})`);
    }
  }
  
  // Check medium-value terms with cap
  for (const term of POSITIVE_KEYWORDS.medium) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const cappedCount = Math.min(matches.length, POSITIVE_CAP_PER_TERM);
      score += cappedCount * 2;
      posHits.push(`${term} (raw: ${matches.length}, capped: ${cappedCount})`);
    }
  }
  
  // Check low-value terms with cap
  for (const term of POSITIVE_KEYWORDS.low) {
    const regex = new RegExp(`\\b${term === '$' ? '\\$' : term}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const cappedCount = Math.min(matches.length, POSITIVE_CAP_PER_TERM);
      score += cappedCount * 0.5;
      posHits.push(`${term} (raw: ${matches.length}, capped: ${cappedCount})`);
    }
  }
  
  // Check negative keywords with cap
  let negativeScore = 0;
  for (const term of NEGATIVE_KEYWORDS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const cappedCount = Math.min(matches.length, NEGATIVE_CAP_PER_TERM);
      negativeScore += cappedCount * 3;
      negHits.push(`${term} (raw: ${matches.length}, capped: ${cappedCount})`);
    }
  }
  
  // Additional heuristics (moderate weight, no cap needed)
  if (lowerText.includes('$') && lowerText.match(/\$\d+/)) {
    score += 1;
    if (!posHits.some(h => h.includes('$'))) {
      posHits.push('price indication');
    }
  }
  
  if (lowerText.match(/\d+\s*mm/)) {
    score += 1;
    if (!posHits.some(h => h.includes('mm'))) {
      posHits.push('mm measurements');
    }
  }
  
  if (lowerText.match(/\d+\s*(g|grams|oz|ounces)/)) {
    score += 1;
    if (!posHits.some(h => h.includes('g') || h.includes('oz'))) {
      posHits.push('weight measurements');
    }
  }
  
  // Calculate final score (negative penalty applied)
  const rawScore = Math.max(0, score - negativeScore);
  
  // Anchor bonus (no auto-pass, just a bonus)
  const ANCHOR_BONUS = hasAnchor ? 5 : 0;
  const finalScore = rawScore + ANCHOR_BONUS;
  
  // Thresholds
  const BASE_SCORE_THRESHOLD = 8;
  const NEGATIVE_SCORE_THRESHOLD = 6;
  
  // Determine if article is likely about shoes
  let ok = false;
  
  // Rule 1: Check score threshold and negative dominance
  if (finalScore >= BASE_SCORE_THRESHOLD && negativeScore < NEGATIVE_SCORE_THRESHOLD) {
    ok = true;
  }
  
  // Rule 2: Check for generic-only case with negative dominance
  const hasSpecificTerms = posHits.some(hit => 
    !POSITIVE_KEYWORDS.low.some(lowTerm => hit.includes(lowTerm))
  );
  
  // If no specific terms and negative score is significant, reject
  if (!hasSpecificTerms && negativeScore >= 3) {
    ok = false;
  }
  
  // Rule 3: If no specific terms and only generic hits, reject
  if (!hasSpecificTerms && posHits.length > 0) {
    ok = false;
  }
  
  return {
    ok,
    score: finalScore, // Return final score with anchor bonus
    has_anchor: hasAnchor,
    pos_hits: posHits.slice(0, 5), // Limit to 5
    neg_hits: negHits.slice(0, 5)  // Limit to 5
  };
}

// Title prefilter to skip non-shoe gear articles based on title
function titlePrefilter(title: string): {
  decision: 'skip' | 'pass';
  matched_negatives: string[];
  matched_positives: string[];
} {
  const lowerTitle = title.toLowerCase();
  const negativeKeywords = [
    'headphones', 'earbud', 'earbuds', 'watch', 'garmin', 'gps watch', 'water bottle', 'handheld bottle', 'hydration bottle',
    'massage gun', 'percussion therapy', 'treadmill', 'socks', 'shorts', 'jacket', 'vest', 'belt', 'pack', 'headlamp', 'light', 'nutrition', 'gels', 'poles',
    // patterns
    'best', 'watches', 'bottles', 'massage guns', 'gift ideas', 'holiday gift guide'
  ];
  const positiveKeywords = [
    'shoe', 'shoes', 'sneaker', 'running shoe', 'trail shoe', 'trainer'
  ];

  // Check for positive override first
  const matchedPositives: string[] = [];
  for (const pos of positiveKeywords) {
    if (lowerTitle.includes(pos)) {
      matchedPositives.push(pos);
    }
  }

  // If there's a positive match, we pass regardless of negatives
  if (matchedPositives.length > 0) {
    return { decision: 'pass', matched_negatives: [], matched_positives: matchedPositives };
  }

  // Check negatives
  const matchedNegatives: string[] = [];
  for (const neg of negativeKeywords) {
    if (lowerTitle.includes(neg)) {
      matchedNegatives.push(neg);
    }
  }

  // Additional pattern checks
  if (lowerTitle.includes('best') && lowerTitle.includes('watches')) {
    matchedNegatives.push('best_watches_pattern');
  }
  if (lowerTitle.includes('best') && lowerTitle.includes('bottles')) {
    matchedNegatives.push('best_bottles_pattern');
  }
  if (lowerTitle.includes('best') && lowerTitle.includes('massage guns')) {
    matchedNegatives.push('best_massage_guns_pattern');
  }
  if (lowerTitle.includes('gift ideas')) {
    matchedNegatives.push('gift_ideas');
  }
  if (lowerTitle.includes('holiday gift guide')) {
    matchedNegatives.push('holiday_gift_guide');
  }

  if (matchedNegatives.length > 0) {
    return { decision: 'skip', matched_negatives: matchedNegatives, matched_positives: [] };
  }

  return { decision: 'pass', matched_negatives: [], matched_positives: [] };
}

// Helper to extract lightweight text from HTML for prefiltering (no DOM parsing)
export function extractLightweightText(html: string, maxChars: number): string {
  // Take only first maxChars characters of HTML
  const sliced = html.slice(0, maxChars);
  // Very basic tag stripping - replace tags with space to avoid matching inside attributes
  const text = sliced.replace(/<[^>]*>/g, ' ');
  // Collapse multiple spaces and trim
  return text.replace(/\s+/g, ' ').trim();
}

// Helper to inject source telemetry into result objects
function injectSourceTelemetry(
  result: any,
  source_used: string,
  content_len: number,
  fetched_html_bytes: number
): any {
  return {
    ...result,
    source_used,
    content_len,
    fetched_html_bytes
  };
}

// Pure function to simulate large_html skipped case with prefilter telemetry (for testing)
export function simulateLargeHtmlSkipped(
  html: string, 
  title: string,
  contentLen: number,
  fetchedHtmlBytes: number,
  maxPrefilterChars: number = parseInt(process.env.MAX_PREFILTER_CHARS || '160000', 10)
): any {
  // Run title prefilter (same logic as in pipeline)
  const titlePrefilterResult = titlePrefilter(title);
  
  // If title indicates non-shoe, return early skip
  if (titlePrefilterResult.decision === 'skip') {
    return {
      mode: 'skipped' as const,
      reason: 'not_shoe_article',
      not_shoe_signal: 'title',
      title_prefilter: titlePrefilterResult,
      stage: 'title_prefilter'
    };
  }

  // Extract lightweight text for prefiltering (same logic as in pipeline)
  const lightweightText = extractLightweightText(html, maxPrefilterChars);
  const lightweightPrefilterResult = isLikelyShoeArticle(lightweightText);
  
  // Build the would-be specs_json patch for large_html skipped case
  return {
    mode: 'skipped' as const,
    reason: 'large_html',
    stage: 'size_guard',
    bytes_length: html.length,
    // Include prefilter telemetry from lightweight prefilter (Fix #1)
    prefilter_score: lightweightPrefilterResult.score,
    prefilter_has_anchor: lightweightPrefilterResult.has_anchor,
    prefilter_pos_hits: lightweightPrefilterResult.pos_hits,
    prefilter_neg_hits: lightweightPrefilterResult.neg_hits
  };
}

// 2. WINDOWING FUNCTION
function buildKeywordWindows(
  text: string, 
  windowRadius: number = WINDOW_RADIUS,
  maxTotalChars: number = MAX_WINDOW_TOTAL_CHARS
): { 
  windows: Array<{ start: number; end: number; text: string }>;
  telemetry: { hit_count: number; window_count: number; total_chars: number };
} {
  const keywords = ['drop', 'stack', 'heel', 'forefoot', 'weight', '$', 'msrp', 'mm', 'oz', 'g'];
  const lowerText = text.toLowerCase();
  const hits: number[] = [];
  
  // Find all keyword positions
  for (const keyword of keywords) {
    let pos = lowerText.indexOf(keyword);
    while (pos !== -1) {
      hits.push(pos);
      pos = lowerText.indexOf(keyword, pos + 1);
    }
  }
  
  hits.sort((a, b) => a - b);
  const hit_count = hits.length;
  
  if (hit_count === 0) {
    return {
      windows: [{ start: 0, end: Math.min(text.length, maxTotalChars), text: text.substring(0, Math.min(text.length, maxTotalChars)) }],
      telemetry: { hit_count: 0, window_count: 1, total_chars: Math.min(text.length, maxTotalChars) }
    };
  }
  
  // Create windows around each hit
  const rawWindows: Array<{ start: number; end: number }> = [];
  for (const hit of hits) {
    const start = Math.max(0, hit - windowRadius);
    const end = Math.min(text.length, hit + windowRadius);
    rawWindows.push({ start, end });
  }
  
  // Merge overlapping windows
  const mergedWindows: Array<{ start: number; end: number }> = [];
  let currentWindow = rawWindows[0];
  
  for (let i = 1; i < rawWindows.length; i++) {
    const nextWindow = rawWindows[i];
    if (nextWindow.start <= currentWindow.end) {
      // Windows overlap, merge them
      currentWindow.end = Math.max(currentWindow.end, nextWindow.end);
    } else {
      // No overlap, push current window and start new one
      mergedWindows.push(currentWindow);
      currentWindow = nextWindow;
    }
  }
  mergedWindows.push(currentWindow);
  
  // Cap total characters by taking earliest windows first
  const cappedWindows: Array<{ start: number; end: number }> = [];
  let totalChars = 0;
  
  for (const window of mergedWindows) {
    const windowLength = window.end - window.start;
    if (totalChars + windowLength <= maxTotalChars) {
      cappedWindows.push(window);
      totalChars += windowLength;
    } else {
      // Add partial window to reach maxTotalChars
      const remaining = maxTotalChars - totalChars;
      if (remaining > 0) {
        cappedWindows.push({ start: window.start, end: window.start + remaining });
        totalChars += remaining;
      }
      break;
    }
  }
  
  // Extract text for each window
  const windows = cappedWindows.map(w => ({
    start: w.start,
    end: w.end,
    text: text.substring(w.start, w.end)
  }));
  
  return {
    windows,
    telemetry: {
      hit_count,
      window_count: windows.length,
      total_chars: totalChars
    }
  };
}

// Snippet scoring and cluster building configuration
const SNIPPET_TOP_N = parseInt(process.env.SNIPPET_TOP_N || '8', 10);
const DEBUG_SPEC_CLUSTER = process.env.DEBUG_SPEC_CLUSTER === '1';

// Score a snippet based on spec density
function scoreSnippet(snippet: string): number {
  let score = 0;
  const lower = snippet.toLowerCase();
  
  // Weight pattern (g or oz)
  if (/\b(\d+)\s*(g|grams|oz|ounces)\b/i.test(snippet)) score += 2;
  
  // Drop pattern (mm)
  if (/\bdrop\s*[:\-]?\s*\d{1,2}\s*mm\b/i.test(snippet)) score += 2;
  
  // Stack pattern (heel/forefoot mm)
  if (/(\d+)\s*mm.*(heel|forefoot)|(heel|forefoot).*(\d+)\s*mm/i.test(snippet)) score += 2;
  
  // Price pattern ($ or USD)
  if (/\$(\d+)/.test(snippet)) score += 1;
  
  // Keyword anchors
  const keywords = ['stack', 'drop', 'heel', 'forefoot', 'weight'];
  keywords.forEach(kw => {
    if (lower.includes(kw)) score += 1;
  });
  
  return score;
}

// Select top N snippets by score
function selectTopSnippets(snippets: string[], topN: number): string[] {
  if (snippets.length === 0) return [];
  
  const scored = snippets.map(s => ({ snippet: s, score: scoreSnippet(s) }));
  scored.sort((a, b) => b.score - a.score);
  
  return scored
    .filter(s => s.score > 0)
    .slice(0, topN)
    .map(s => s.snippet);
}

// Build best cluster from top snippets
function buildBestCluster(topSnippets: string[]): {
  cluster: {
    weight_g?: number | null;
    drop_mm?: number | null;
    heel_mm?: number | null;
    forefoot_mm?: number | null;
    price_usd?: number | null;
  };
  cluster_score: number;
  cluster_sources: number[];
  reason?: string;
} | null {
  if (topSnippets.length === 0) return null;
  
  const clusters: Array<{
    weight_g?: number | null;
    drop_mm?: number | null;
    heel_mm?: number | null;
    forefoot_mm?: number | null;
    price_usd?: number | null;
    score: number;
    sources: number[];
  }> = [];
  
  // Analyze each snippet individually
  for (let i = 0; i < topSnippets.length; i++) {
    const snippet = topSnippets[i];
    const cluster: any = {};
    let snippetScore = 0;
    
    // Extract weight
    const gramMatch = snippet.match(/(\d{2,4})\s*(g|grams)\b/i);
    if (gramMatch) {
      const grams = parseInt(gramMatch[1], 10);
      if (grams >= 50 && grams <= 1000) {
        cluster.weight_g = grams;
        snippetScore += 2;
      }
    }
    
    const ozMatch = snippet.match(/(\d{1,2}(?:\.\d)?)\s*(oz|ounces)\b/i);
    if (ozMatch) {
      const oz = parseFloat(ozMatch[1]);
      if (oz >= 3 && oz <= 30) {
        cluster.weight_g = Math.round(oz * 28.3495);
        snippetScore += 2;
      }
    }
    
    // Extract drop
    const dropMatch = snippet.match(/\bdrop\s*[:\-]?\s*(\d{1,2})\s*mm\b/i);
    if (dropMatch) {
      const drop = parseInt(dropMatch[1], 10);
      if (drop >= 0 && drop <= 25) {
        cluster.drop_mm = drop;
        snippetScore += 2;
      }
    }

    // Extract heel
    const heelMatch = snippet.match(/(\d{2})\s*mm.*heel|heel.*(\d{2})\s*mm/i);
    if (heelMatch) {
      const numMatch = heelMatch[0].match(/\d{2}/);
      if (numMatch) {
        const heel = parseInt(numMatch[0], 10);
        if (heel >= 5 && heel <= 60) {
          cluster.heel_mm = heel;
          snippetScore += 2;
        }
      }
    }
    
    // Extract forefoot
    const forefootMatch = snippet.match(/(\d{2})\s*mm.*forefoot|forefoot.*(\d{2})\s*mm/i);
    if (forefootMatch) {
      const numMatch = forefootMatch[0].match(/\d{2}/);
      if (numMatch) {
        const forefoot = parseInt(numMatch[0], 10);
        if (forefoot >= 5 && forefoot <= 60) {
          cluster.forefoot_mm = forefoot;
          snippetScore += 2;
        }
      }
    }
    
    // Extract price
    const priceMatch = snippet.match(/\$(\d{2,4})(?:\.\d{2})?/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1], 10);
      if (price >= 50 && price <= 500) {
        cluster.price_usd = price;
        snippetScore += 1;
      }
    }
    
    // Count how many spec groups are present
    const specGroups = [
      cluster.weight_g !== undefined ? 'weight' : null,
      cluster.drop_mm !== undefined ? 'drop' : null,
      (cluster.heel_mm !== undefined || cluster.forefoot_mm !== undefined) ? 'stack' : null,
      cluster.price_usd !== undefined ? 'price' : null
    ].filter(Boolean).length;
    
    // Only consider clusters with at least 2 spec groups
    if (specGroups >= 2) {
      cluster.score = snippetScore;
      cluster.sources = [i];
      clusters.push(cluster);
    }
  }
  
  if (clusters.length === 0) return null;
  
  // Find the highest scoring cluster
  let bestCluster = clusters[0];
  for (let i = 1; i < clusters.length; i++) {
    if (clusters[i].score > bestCluster.score) {
      bestCluster = clusters[i];
    }
  }
  
  // Check for competing clusters within 10% score
  const scoreThreshold = bestCluster.score * 0.9;
  const competingClusters = clusters.filter(c => 
    c !== bestCluster && c.score >= scoreThreshold
  );
  
  if (competingClusters.length > 0) {
    return {
      cluster: bestCluster,
      cluster_score: bestCluster.score,
      cluster_sources: bestCluster.sources,
      reason: 'multiple_competing_clusters'
    };
  }
  
  return {
    cluster: {
      weight_g: bestCluster.weight_g !== undefined ? bestCluster.weight_g : null,
      drop_mm: bestCluster.drop_mm !== undefined ? bestCluster.drop_mm : null,
      heel_mm: bestCluster.heel_mm !== undefined ? bestCluster.heel_mm : null,
      forefoot_mm: bestCluster.forefoot_mm !== undefined ? bestCluster.forefoot_mm : null,
      price_usd: bestCluster.price_usd !== undefined ? bestCluster.price_usd : null
    },
    cluster_score: bestCluster.score,
    cluster_sources: bestCluster.sources
  };
}

// 3. SAFE DETERMINISTIC EXTRACTION ON WINDOWS
function extractSpecsFromWindows(
  windows: Array<{ text: string }>
): {
  mode: 'single' | 'ambiguous_multi' | 'skipped';
  price_usd?: number | null;
  drop_mm?: number | null;
  weight_g?: number | null;
  heel_mm?: number | null;
  forefoot_mm?: number | null;
  raw_strings?: Record<string, string | undefined>;
  candidates?: any;
  requires_llm_resolution?: boolean;
  reason?: string;
  window_telemetry?: any;
  snippet_top_n?: number;
  snippet_scoring_enabled?: boolean;
  cluster_score?: number;
  cluster_sources?: number[];
  single_reason?: string;
} {
  // Helper to extract context around a match
  function getCtx(text: string, start: number, len: number, radius = 200): string {
    const s = Math.max(0, start - radius);
    const e = Math.min(text.length, start + len + radius);
    return text.slice(s, e);
  }

  const allValues = {
    price_usd: new Set<number>(),
    drop_mm: new Set<number>(),
    weight_g: new Set<number>(),
    heel_mm: new Set<number>(),
    forefoot_mm: new Set<number>()
  };
  
  const stackHeightValues = new Set<number>();
  const heelRegexValues = new Set<number>();
  
  const rawStrings = {
    price: [] as string[],
    drop: [] as string[],
    weight: [] as string[],
    heel: [] as string[],
    forefoot: [] as string[]
  };
  
  // Extract from each window
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    const text = window.text;

    // DEBUG: Check for jammed text in window
    if (DEBUG_SPEC_CLUSTER && forceId !== null) {
      const hasDrop10mm = text.includes('Drop10mm');
      const hasStackHeight43mm = text.includes('Stack Height43mm');
      const dropIdx = text.indexOf('Drop');
      const weightIdx = text.toLowerCase().indexOf('weight');
      
      logger.info({
        ID: forceId,
        step: 'window_text_debug',
        window_index: i,
        hasDrop10mm,
        hasStackHeight43mm,
        dropIdx,
        weightIdx,
        text_length: text.length
      }, 'Window text debug for jammed block');

      // If the jammed block is not found, show a slice around the first "Weight"
      if (!hasDrop10mm || !hasStackHeight43mm) {
        if (weightIdx !== -1) {
          const sliceStart = Math.max(0, weightIdx - 100);
          const sliceEnd = Math.min(text.length, weightIdx + 400);
          logger.info({
            ID: forceId,
            step: 'window_text_slice',
            weightIdx,
            slice: text.slice(sliceStart, sliceEnd)
          }, 'Window text slice around "Weight"');
        }
      }
    }
    
    // Extract price
    const priceRe = /\$(\d{2,4})(?:\.\d{2})?/g;
    let priceMatch;
    while ((priceMatch = priceRe.exec(text)) !== null) {
      const value = parseInt(priceMatch[1], 10);
      if (value >= 50 && value <= 500) {
        allValues.price_usd.add(value);
        rawStrings.price.push(getCtx(text, priceMatch.index, priceMatch[0].length));
      }
      if (priceMatch.index === priceRe.lastIndex) priceRe.lastIndex++;
    }

    // Extract drop (mm) - handles jammed labels like "Drop10mmStack"
    const dropRe = /\bdrop\s*[:\-]?\s*(\d{1,2})\s*mm(?=\b|[A-Z]|$)/gi;
    let dropMatch;
    while ((dropMatch = dropRe.exec(text)) !== null) {
      const value = parseInt(dropMatch[1], 10);
      if (DEBUG_SPEC_CLUSTER && forceId !== null) {
        logger.info({
          ID: forceId,
          step: 'drop_regex_match',
          match: dropMatch[0],
          value: value,
          index: dropMatch.index
        }, 'Drop regex match found');
      }
      if (value >= 0 && value <= 25) {
        allValues.drop_mm.add(value);
        rawStrings.drop.push(getCtx(text, dropMatch.index, dropMatch[0].length));
      }
      if (dropMatch.index === dropRe.lastIndex) dropRe.lastIndex++;
    }

    // Extract stack height (single value; treat as heel stack) - handles jammed labels
    const stackHeightRe = /stack\s*height\s*[:\-]?\s*(\d{2})\s*mm/gi;
    let stackHeightMatch;
    while ((stackHeightMatch = stackHeightRe.exec(text)) !== null) {
      const value = parseInt(stackHeightMatch[1], 10);
      if (DEBUG_SPEC_CLUSTER && forceId !== null) {
        logger.info({
          ID: forceId,
          step: 'stack_height_regex_match',
          match: stackHeightMatch[0],
          value: value,
          index: stackHeightMatch.index,
          text_slice: text.slice(Math.max(0, stackHeightMatch.index - 20), Math.min(text.length, stackHeightMatch.index + 30))
        }, 'Stack height regex match found');
      }
      if (value >= 5 && value <= 60) {
        allValues.heel_mm.add(value);
        stackHeightValues.add(value);
        rawStrings.heel.push(getCtx(text, stackHeightMatch.index, stackHeightMatch[0].length));
      }
      if (stackHeightMatch.index === stackHeightRe.lastIndex) stackHeightRe.lastIndex++;
    }

    // Extract weight (grams)
    const gramRe = /(\d{2,4})\s*(?:g|grams)\b/gi;
    let gramMatch;
    while ((gramMatch = gramRe.exec(text)) !== null) {
      const value = parseInt(gramMatch[1], 10);
      if (value >= 50 && value <= 1000) {
        allValues.weight_g.add(value);
        rawStrings.weight.push(getCtx(text, gramMatch.index, gramMatch[0].length));
      }
      if (gramMatch.index === gramRe.lastIndex) gramRe.lastIndex++;
    }

    // Extract weight (ounces)
    const ozRe = /(\d{1,2}(?:\.\d)?)\s*(?:oz|ounces)\b/gi;
    let ozMatch;
    while ((ozMatch = ozRe.exec(text)) !== null) {
      const oz = parseFloat(ozMatch[1]);
      if (oz >= 3 && oz <= 30) {
        const grams = Math.round(oz * 28.3495);
        allValues.weight_g.add(grams);
        rawStrings.weight.push(getCtx(text, ozMatch.index, ozMatch[0].length));
      }
      if (ozMatch.index === ozRe.lastIndex) ozRe.lastIndex++;
    }

    // Extract heel (mm)
    const heelRe = /(\d{2})\s*mm.*heel|heel.*(\d{2})\s*mm/gi;
    let heelMatch;
    while ((heelMatch = heelRe.exec(text)) !== null) {
      const numMatch = heelMatch[0].match(/\d{2}/);
      if (numMatch) {
        const value = parseInt(numMatch[0], 10);
        if (value >= 5 && value <= 60) {
          allValues.heel_mm.add(value);
          heelRegexValues.add(value);
          rawStrings.heel.push(getCtx(text, heelMatch.index, heelMatch[0].length));
        }
      }
      if (heelMatch.index === heelRe.lastIndex) heelRe.lastIndex++;
    }

    // Extract forefoot (mm)
    const forefootRe = /(\d{2})\s*mm.*forefoot|forefoot.*(\d{2})\s*mm/gi;
    let forefootMatch;
    while ((forefootMatch = forefootRe.exec(text)) !== null) {
      const numMatch = forefootMatch[0].match(/\d{2}/);
      if (numMatch) {
        const value = parseInt(numMatch[0], 10);
        if (value >= 5 && value <= 60) {
          allValues.forefoot_mm.add(value);
          rawStrings.forefoot.push(getCtx(text, forefootMatch.index, forefootMatch[0].length));
        }
      }
      if (forefootMatch.index === forefootRe.lastIndex) forefootRe.lastIndex++;
    }
  }

  // DEBUG: Log extracted values
  if (DEBUG_SPEC_CLUSTER && forceId !== null) {
    logger.info({
      ID: forceId,
      step: 'extracted_values_debug',
      price_usd: Array.from(allValues.price_usd),
      drop_mm: Array.from(allValues.drop_mm),
      weight_g: Array.from(allValues.weight_g),
      heel_mm: Array.from(allValues.heel_mm),
      forefoot_mm: Array.from(allValues.forefoot_mm)
    }, 'Extracted values debug');
  }
  
  // Convert sets to arrays for analysis, with preference for stack height values
  const priceValues = Array.from(allValues.price_usd);
  const dropValues = Array.from(allValues.drop_mm);
  const weightValues = Array.from(allValues.weight_g);
  let heelValues = Array.from(allValues.heel_mm);
  const forefootValues = Array.from(allValues.forefoot_mm);
  
  // Prefer stack height values over generic heel regex matches
  if (stackHeightValues.size > 0) {
    heelValues = Array.from(stackHeightValues);
  }
  
  // Check for multiple distinct values
  const hasMultiplePrices = priceValues.length > 1;
  const hasMultipleDrops = dropValues.length > 1;
  const hasMultipleWeights = weightValues.length > 1;
  const hasMultipleHeels = heelValues.length > 1;
  const hasMultipleForefoot = forefootValues.length > 1;
  
  const hasMultipleValues = hasMultiplePrices || hasMultipleDrops || hasMultipleWeights || 
                           hasMultipleHeels || hasMultipleForefoot;
  
  // SPECIAL CASE: Unique drop and heel with multiple weights (jammed block scenario)
  if (hasMultipleValues && dropValues.length === 1 && heelValues.length === 1) {
    // We have unique drop and heel, even if weight is multiple - use the first weight
    return {
      mode: 'single',
      price_usd: priceValues.length > 0 ? priceValues[0] : null,
      drop_mm: dropValues[0],
      weight_g: weightValues.length > 0 ? weightValues[0] : null,
      heel_mm: heelValues[0],
      forefoot_mm: forefootValues.length > 0 ? forefootValues[0] : null,
      raw_strings: {
        price_snippet: rawStrings.price[0] || undefined,
        drop_snippet: rawStrings.drop[0] || undefined,
        weight_snippet: rawStrings.weight[0] || undefined,
        heel_snippet: rawStrings.heel[0] || undefined,
        forefoot_snippet: rawStrings.forefoot[0] || undefined
      },
      window_telemetry: {
        price_found: priceValues.length > 0,
        drop_found: true,
        weight_found: weightValues.length > 0,
        heel_found: true,
        forefoot_found: forefootValues.length > 0
      },
      single_reason: 'unique_drop_and_heel_with_multiple_weights'
    };
  }
  
  // Try cluster-based resolution if we have multiple values
  if (hasMultipleValues) {
    // Collect all snippets across categories
    const allSnippets = [
      ...rawStrings.price,
      ...rawStrings.drop,
      ...rawStrings.weight,
      ...rawStrings.heel,
      ...rawStrings.forefoot
    ];
    
    // Select top snippets by spec density
    const topSnippets = selectTopSnippets(allSnippets, SNIPPET_TOP_N);
    
    // Build best cluster
    const clusterResult = buildBestCluster(topSnippets);
    
    if (DEBUG_SPEC_CLUSTER && forceId !== null) {
      logger.info({
        ID: forceId,
        step: 'spec_cluster_debug',
        all_snippets_count: allSnippets.length,
        top_snippets_count: topSnippets.length,
        top_snippets: topSnippets.map((s, i) => ({ index: i, snippet: s.substring(0, 100), score: scoreSnippet(s) })),
        cluster_result: clusterResult
      }, 'Spec cluster debug info');
    }
    
    // If we have a cluster that's not competing, use it
    if (clusterResult && (!clusterResult.reason || clusterResult.reason !== 'multiple_competing_clusters')) {
      const { cluster, cluster_score, cluster_sources } = clusterResult;
      
      return {
        mode: 'single',
        price_usd: cluster.price_usd !== undefined ? cluster.price_usd : null,
        drop_mm: cluster.drop_mm !== undefined ? cluster.drop_mm : null,
        weight_g: cluster.weight_g !== undefined ? cluster.weight_g : null,
        heel_mm: cluster.heel_mm !== undefined ? cluster.heel_mm : null,
        forefoot_mm: cluster.forefoot_mm !== undefined ? cluster.forefoot_mm : null,
        snippet_top_n: SNIPPET_TOP_N,
        snippet_scoring_enabled: true,
        cluster_score,
        cluster_sources,
        single_reason: 'proximity_join',
        window_telemetry: {
          price_found: cluster.price_usd !== undefined && cluster.price_usd !== null,
          drop_found: cluster.drop_mm !== undefined && cluster.drop_mm !== null,
          weight_found: cluster.weight_g !== undefined && cluster.weight_g !== null,
          heel_found: cluster.heel_mm !== undefined && cluster.heel_mm !== null,
          forefoot_found: cluster.forefoot_mm !== undefined && cluster.forefoot_mm !== null
        }
      };
    }
    
    // Otherwise, return ambiguous_multi with top snippets as candidates
    const candidates = {
      price_snippets: rawStrings.price.slice(0, 5).map(s => s.substring(0, 300)),
      drop_snippets: rawStrings.drop.slice(0, 5).map(s => s.substring(0, 300)),
      weight_snippets: rawStrings.weight.slice(0, 5).map(s => s.substring(0, 300)),
      heel_snippets: rawStrings.heel.slice(0, 5).map(s => s.substring(0, 300)),
      forefoot_snippets: rawStrings.forefoot.slice(0, 5).map(s => s.substring(0, 300))
    };
    
    return {
      mode: 'ambiguous_multi',
      requires_llm_resolution: true,
      candidates,
      snippet_top_n: SNIPPET_TOP_N,
      snippet_scoring_enabled: true,
      window_telemetry: {
        price_count: priceValues.length,
        drop_count: dropValues.length,
        weight_count: weightValues.length,
        heel_count: heelValues.length,
        forefoot_count: forefootValues.length
      }
    };
  }
  
  // Single value extraction (no multiple values)
  const price_usd = priceValues.length > 0 ? priceValues[0] : null;
  const drop_mm = dropValues.length > 0 ? dropValues[0] : null;
  const weight_g = weightValues.length > 0 ? weightValues[0] : null;
  const heel_mm = heelValues.length > 0 ? heelValues[0] : null;
  const forefoot_mm = forefootValues.length > 0 ? forefootValues[0] : null;
  
  // Check if we found any specs
  const foundAnySpecs = price_usd !== null || drop_mm !== null || weight_g !== null || 
                       heel_mm !== null || forefoot_mm !== null;
  
  if (foundAnySpecs) {
    return {
      mode: 'single',
      price_usd,
      drop_mm,
      weight_g,
      heel_mm,
      forefoot_mm,
      raw_strings: {
        price_snippet: rawStrings.price[0]?.substring(0, 200) || undefined,
        drop_snippet: rawStrings.drop[0]?.substring(0, 200) || undefined,
        weight_snippet: rawStrings.weight[0]?.substring(0, 200) || undefined,
        heel_snippet: rawStrings.heel[0]?.substring(0, 200) || undefined,
        forefoot_snippet: rawStrings.forefoot[0]?.substring(0, 200) || undefined
      },
      window_telemetry: {
        price_found: price_usd !== null,
        drop_found: drop_mm !== null,
        weight_found: weight_g !== null,
        heel_found: heel_mm !== null,
        forefoot_found: forefoot_mm !== null
      }
    };
  }
  
  // No specs found
  return {
    mode: 'skipped',
    reason: 'no_specs_found',
    window_telemetry: {
      price_found: false,
      drop_found: false,
      weight_found: false,
      heel_found: false,
      forefoot_found: false
    }
  };
}

// Spec keywords for table detection (case-insensitive)
const SPEC_KEYWORDS = [
  'weight',
  'heel drop',
  'drop',
  'stack',
  'heel',
  'forefoot',
  'price',
  'retail price'
];

function normalizeSpecKey(key: string): string | null {
  const lower = key.toLowerCase().trim();
  if (lower.includes('weight')) return 'weight';
  if (lower.includes('heel') && lower.includes('drop')) return 'drop_mm';
  if (lower.includes('drop')) return 'drop_mm';
  if (lower.includes('stack')) return 'stack';
  if (lower.includes('heel')) return 'heel_mm';
  if (lower.includes('forefoot')) return 'forefoot_mm';
  if (lower.includes('price')) return 'price_usd';
  return null;
}

function parseWeightValue(text: string): { weight_g?: number; weight_oz?: number } {
  const gramsMatch = text.match(/(\d{2,4})\s*(g|grams)\b/i);
  if (gramsMatch) {
    return { weight_g: parseInt(gramsMatch[1], 10) };
  }
  const ozMatch = text.match(/(\d{1,2}(?:\.\d)?)\s*(oz|ounces)\b/i);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1]);
    return { weight_oz: oz, weight_g: Math.round(oz * 28.3495) };
  }
  return {};
}

function parseStackValue(text: string): { heel_mm?: number; forefoot_mm?: number; drop_mm?: number } {
  const heelMatch = text.match(/(\d{2})\s*mm/i);
  // Heuristic: if text contains 'heel' or 'forefoot'
  if (text.toLowerCase().includes('heel') && heelMatch) {
    return { heel_mm: parseInt(heelMatch[1], 10) };
  }
  if (text.toLowerCase().includes('forefoot') && heelMatch) {
    return { forefoot_mm: parseInt(heelMatch[1], 10) };
  }
  const dropMatch = text.match(/(\d{1,2})\s*mm/i);
  if (dropMatch) {
    return { drop_mm: parseInt(dropMatch[1], 10) };
  }
  return {};
}

function parsePriceValue(text: string): { price_usd?: number } {
  const priceRegexes = [
    { regex: /\$(\d{2,4})(?:\.\d{2})?/, currency: 'USD' as const },
    { regex: /€\s?(\d{2,4})(?:\.\d{2})?/, currency: 'EUR' as const },
    { regex: /£\s?(\d{2,4})(?:\.\d{2})?/, currency: 'GBP' as const }
  ];
  for (const { regex, currency } of priceRegexes) {
    const match = text.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);
      const price_usd = currency === 'USD' ? value : Math.round(value * CURRENCY_RATES[currency]);
      return { price_usd };
    }
  }
  return {};
}

function extractMultiModelFromTables($: any, debugMode: boolean = false): {
  data: {
    mode: 'multi_table';
    table_match_confidence: number;
    models: Array<{
      model_name: string;
      weight_g?: number | null;
      weight_oz?: number | null;
      heel_mm?: number | null;
      forefoot_mm?: number | null;
      drop_mm?: number | null;
      price_usd?: number | null;
      raw?: Record<string, string>;
    }>;
    source_labels_found: string[];
  } | null;
  tables_total: number;
  candidates_found: number;
} {
  const tables = $('table');
  let bestTable: any = null;
  let bestScore = 0;
  let selectedTableIndex: number | null = null;
  let candidatesFound = 0;
  
  // Table diagnostics array (only populated in debug mode)
  const tableDiagnostics: Array<{
    table_index: number;
    rows_count: number;
    cols_max: number;
    header_cells_count: number | null;
    spec_keyword_hits_count: number;
    is_candidate: boolean;
    confidence_score: number;
  }> = [];

  // Iterate over tables using for loop
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const $table = $(table);
    const rows = $table.find('tr');
    const rowsCount = rows.length;
    
    // Calculate maximum columns in any row
    let colsMax = 0;
    rows.each((_: any, row: any) => {
      const cellCount = $(row).find('th, td').length;
      colsMax = Math.max(colsMax, cellCount);
    });
    
    let headerCellsCount: number | null = null;
    let specRowCount = 0;
    let isCandidate = false;
    let confidenceScore = 0;
    
    if (rowsCount >= 2) {
      const headerCells = rows.first().find('th, td');
      headerCellsCount = headerCells.length;
      
      if (headerCellsCount && headerCellsCount >= 3) { // need at least spec column + 2 model columns
        // Count spec-like rows
        for (let j = 1; j < rows.length; j++) {
          const row = rows[j];
          const $row = $(row);
          const firstCell = $row.find('th, td').first().text().toLowerCase();
          for (const keyword of SPEC_KEYWORDS) {
            if (firstCell.includes(keyword)) {
              specRowCount++;
              break; // count once per row
            }
          }
        }

        if (specRowCount >= 2) {
          isCandidate = true;
          candidatesFound++;
          // headerCellsCount is guaranteed non-null here
          confidenceScore = specRowCount * headerCellsCount!;
          
          if (confidenceScore > bestScore) {
            bestScore = confidenceScore;
            bestTable = $table;
            selectedTableIndex = i;
          }
        }
      }
    }
    
    // Record diagnostics if in debug mode
    if (debugMode) {
      tableDiagnostics.push({
        table_index: i,
        rows_count: rowsCount,
        cols_max: colsMax,
        header_cells_count: headerCellsCount,
        spec_keyword_hits_count: specRowCount,
        is_candidate: isCandidate,
        confidence_score: confidenceScore
      });
    }
  }
  
  // Log table diagnostics if in debug mode
  if (debugMode && tableDiagnostics.length > 0) {
    for (const diag of tableDiagnostics) {
      logger.info(diag, 'Table diagnostic');
    }
    
    // Log final summary
    logger.info({
      tables_total: tables.length,
      candidates_found: candidatesFound,
      selected_table_index: selectedTableIndex,
      detected_mode: bestTable ? 'multi_table' : 'single'
    }, 'Multi-table extraction summary');
  }

  if (!bestTable) {
    return {
      data: null,
      tables_total: tables.length,
      candidates_found: candidatesFound
    };
  }

  // Parse the best candidate table
  const $table = bestTable;
  const rows = $table.find('tr');
  const headerRow = rows.first();
  const modelNames: string[] = [];

  // Extract model names from header (skip first column)
  const headerCells = headerRow.find('th, td');
  for (let i = 1; i < headerCells.length; i++) {
    const cell = headerCells[i];
    modelNames.push($(cell).text().trim().replace(/\s+/g, ' '));
  }

  if (modelNames.length < 2) {
    return {
      data: null,
      tables_total: tables.length,
      candidates_found: candidatesFound
    };
  }

  // Initialize models array
  const models: Array<{
    model_name: string;
    weight_g?: number | null;
    weight_oz?: number | null;
    heel_mm?: number | null;
    forefoot_mm?: number | null;
    drop_mm?: number | null;
    price_usd?: number | null;
    raw?: Record<string, string>;
  }> = modelNames.map(name => ({
    model_name: name,
    raw: {}
  }));

  // Parse spec rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const $row = $(row);
    const cells = $row.find('th, td');
    if (cells.length !== modelNames.length + 1) continue; // mismatched column count

    const specKeyCell = cells.first().text();
    const normalizedKey = normalizeSpecKey(specKeyCell);
    if (!normalizedKey) continue;

    // For each model column (skip first cell)
    for (let j = 1; j < cells.length; j++) {
      const cell = cells[j];
      const cellText = $(cell).text().trim();
      if (!cellText) continue;

      const modelIndex = j - 1; // because we skipped the first cell

      // Store raw value
      if (!models[modelIndex].raw) models[modelIndex].raw = {};
      models[modelIndex].raw![normalizedKey] = cellText;

      // Parse based on spec key
      switch (normalizedKey) {
        case 'weight': {
          const weight = parseWeightValue(cellText);
          if (weight.weight_g !== undefined) models[modelIndex].weight_g = weight.weight_g;
          if (weight.weight_oz !== undefined) models[modelIndex].weight_oz = weight.weight_oz;
          break;
        }
        case 'heel_mm':
        case 'forefoot_mm':
        case 'drop_mm': {
          const stack = parseStackValue(cellText);
          if (normalizedKey === 'heel_mm' && stack.heel_mm !== undefined) models[modelIndex].heel_mm = stack.heel_mm;
          if (normalizedKey === 'forefoot_mm' && stack.forefoot_mm !== undefined) models[modelIndex].forefoot_mm = stack.forefoot_mm;
          if (normalizedKey === 'drop_mm' && stack.drop_mm !== undefined) models[modelIndex].drop_mm = stack.drop_mm;
          break;
        }
        case 'price_usd': {
          const price = parsePriceValue(cellText);
          if (price.price_usd !== undefined) models[modelIndex].price_usd = price.price_usd;
          break;
        }
      }
    }
  }

  // Compute drop from heel and forefoot if missing
  models.forEach(model => {
    if (model.heel_mm !== null && model.forefoot_mm !== null && model.drop_mm === null) {
      model.drop_mm = model.heel_mm! - model.forefoot_mm!;
    }
  });

  // Determine which specs were found
  const sourceLabelsFound: string[] = [];
  const hasWeight = models.some(m => m.weight_g !== null && m.weight_g !== undefined);
  const hasStackOrDrop = models.some(m => m.heel_mm !== null && m.heel_mm !== undefined || 
                                          m.forefoot_mm !== null && m.forefoot_mm !== undefined || 
                                          m.drop_mm !== null && m.drop_mm !== undefined);
  const hasPrice = models.some(m => m.price_usd !== null && m.price_usd !== undefined);

  if (hasWeight) sourceLabelsFound.push('WEIGHT');
  if (hasStackOrDrop) sourceLabelsFound.push('STACK', 'DROP');
  if (hasPrice) sourceLabelsFound.push('PRICE');
  sourceLabelsFound.push('MULTI_TABLE');

  const confidence = Math.min(1.0, bestScore / 20); // simple heuristic

  return {
    data: {
      mode: 'multi_table',
      table_match_confidence: confidence,
      models,
      source_labels_found: sourceLabelsFound
    },
    tables_total: tables.length,
    candidates_found: candidatesFound
  };
}

async function fetchArticleHtml(url: string): Promise<{ html: string; status: number; length: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const html = await response.text();
    return { html, status: response.status, length: html.length };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('HTTP fetch timeout (10 seconds)');
    }
    throw error;
  }
}

// Helper for timeout promises
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

// Worker thread for safe DOM parsing with timeout and multi-table detection
function parseDomWithWorker(html: string, id: number, debugMode: boolean): Promise<{ 
  body_text: string; 
  text_length: number;
  tables_total: number;
  candidates_found: number;
  multi_table_data: any;
}> {
  return new Promise((resolve, reject) => {
    const workerCode = `
      const { parentPort } = require('worker_threads');
      const cheerio = require('cheerio');

      // Spec keywords for table detection (case-insensitive)
      const SPEC_KEYWORDS = [
        'weight',
        'heel drop',
        'drop',
        'stack',
        'heel',
        'forefoot',
        'price',
        'retail price'
      ];

      function normalizeSpecKey(key) {
        const lower = key.toLowerCase().trim();
        if (lower.includes('weight')) return 'weight';
        if (lower.includes('heel') && lower.includes('drop')) return 'drop_mm';
        if (lower.includes('drop')) return 'drop_mm';
        if (lower.includes('stack')) return 'stack';
        if (lower.includes('heel')) return 'heel_mm';
        if (lower.includes('forefoot') && lower.includes('mm')) return 'forefoot_mm';
        if (lower.includes('forefoot')) return 'forefoot_mm';
        if (lower.includes('price')) return 'price_usd';
        return null;
      }

      function parseWeightValue(text) {
        const gramsMatch = text.match(/(\\d{2,4})\\s*(g|grams)\\b/i);
        if (gramsMatch) {
          return { weight_g: parseInt(gramsMatch[1], 10) };
        }
        const ozMatch = text.match(/(\\d{1,2}(?:\\.\\d)?)\\s*(oz|ounces)\\b/i);
        if (ozMatch) {
          const oz = parseFloat(ozMatch[1]);
          return { weight_oz: oz, weight_g: Math.round(oz * 28.3495) };
        }
        return {};
      }

      function parseStackValue(text) {
        const heelMatch = text.match(/(\\d{2})\\s*mm/i);
        // Heuristic: if text contains 'heel' or 'forefoot'
        if (text.toLowerCase().includes('heel') && heelMatch) {
          return { heel_mm: parseInt(heelMatch[1], 10) };
        }
        if (text.toLowerCase().includes('forefoot') && heelMatch) {
          return { forefoot_mm: parseInt(heelMatch[1], 10) };
        }
        const dropMatch = text.match(/(\\d{1,2})\\s*mm/i);
        if (dropMatch) {
          return { drop_mm: parseInt(dropMatch[1], 10) };
        }
        return {};
      }

      function parsePriceValue(text) {
        const priceRegexes = [
          { regex: /\\$(\\d{2,4})(?:\\.\\d{2})?/, currency: 'USD' },
          { regex: /€\\s?(\\d{2,4})(?:\\.\\d{2})?/, currency: 'EUR' },
          { regex: /£\\s?(\\d{2,4})(?:\\.\\d{2})?/, currency: 'GBP' }
        ];
        // Currency conversion rates (fixed)
        const CURRENCY_RATES = {
          USD: 1,
          EUR: 1.08,
          GBP: 1.25
        };
        for (const { regex, currency } of priceRegexes) {
          const match = text.match(regex);
          if (match) {
            const value = parseInt(match[1], 10);
            const price_usd = currency === 'USD' ? value : Math.round(value * CURRENCY_RATES[currency]);
            return { price_usd };
          }
        }
        return {};
      }

      function extractMultiModelFromTables($, debugMode) {
        const tables = $('table');
        let bestTable = null;
        let bestScore = 0;
        let selectedTableIndex = null;
        let candidatesFound = 0;
        
        // Iterate over tables using for loop
        for (let i = 0; i < tables.length; i++) {
          const table = tables[i];
          const $table = $(table);
          const rows = $table.find('tr');
          const rowsCount = rows.length;
          
          // Calculate maximum columns in any row
          let colsMax = 0;
          rows.each((_, row) => {
            const cellCount = $(row).find('th, td').length;
            colsMax = Math.max(colsMax, cellCount);
          });
          
          let headerCellsCount = null;
          let specRowCount = 0;
          let isCandidate = false;
          let confidenceScore = 0;
          
          if (rowsCount >= 2) {
            const headerCells = rows.first().find('th, td');
            headerCellsCount = headerCells.length;
            
            if (headerCellsCount && headerCellsCount >= 3) {
              // Count spec-like rows
              for (let j = 1; j < rows.length; j++) {
                const row = rows[j];
                const $row = $(row);
                const firstCell = $row.find('th, td').first().text().toLowerCase();
                for (const keyword of SPEC_KEYWORDS) {
                  if (firstCell.includes(keyword)) {
                    specRowCount++;
                    break;
                  }
                }
              }

              if (specRowCount >= 2) {
                isCandidate = true;
                candidatesFound++;
                // headerCellsCount is guaranteed non-null here
                confidenceScore = specRowCount * headerCellsCount!;
                
                if (confidenceScore > bestScore) {
                  bestScore = confidenceScore;
                  bestTable = $table;
                  selectedTableIndex = i;
                }
              }
            }
          }
          
          // Record diagnostics if in debug mode
          if (debugMode) {
            tableDiagnostics.push({
              table_index: i,
              rows_count: rowsCount,
              cols_max: colsMax,
              header_cells_count: headerCellsCount,
              spec_keyword_hits_count: specRowCount,
              is_candidate: isCandidate,
              confidence_score: confidenceScore
            });
          }
        }
        
        // Log table diagnostics if in debug mode
        if (debugMode && tableDiagnostics.length > 0) {
          for (const diag of tableDiagnostics) {
            logger.info(diag, 'Table diagnostic');
          }
          
          // Log final summary
          logger.info({
            tables_total: tables.length,
            candidates_found: candidatesFound,
            selected_table_index: selectedTableIndex,
            detected_mode: bestTable ? 'multi_table' : 'single'
          }, 'Multi-table extraction summary');
        }

        if (!bestTable) {
          return {
            data: null,
            tables_total: tables.length,
            candidates_found: candidatesFound
          };
        }

        // Parse the best candidate table
        const $table = bestTable;
        const rows = $table.find('tr');
        const headerRow = rows.first();
        const modelNames: string[] = [];

        // Extract model names from header (skip first column)
        const headerCells = headerRow.find('th, td');
        for (let i = 1; i < headerCells.length; i++) {
          const cell = headerCells[i];
          modelNames.push($(cell).text().trim().replace(/\\s+/g, ' '));
        }

        if (modelNames.length < 2) {
          return {
            data: null,
            tables_total: tables.length,
            candidates_found: candidatesFound
          };
        }

        // Initialize models array
        const models: Array<{
          model_name: string;
          weight_g?: number | null;
          weight_oz?: number | null;
          heel_mm?: number | null;
          forefoot_mm?: number | null;
          drop_mm?: number | null;
          price_usd?: number | null;
          raw?: Record<string, string>;
        }> = modelNames.map(name => ({
          model_name: name,
          raw: {}
        }));

        // Parse spec rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const $row = $(row);
          const cells = $row.find('th, td');
          if (cells.length !== modelNames.length + 1) continue; // mismatched column count

          const specKeyCell = cells.first().text();
          const normalizedKey = normalizeSpecKey(specKeyCell);
          if (!normalizedKey) continue;

          // For each model column (skip first cell)
          for (let j = 1; j < cells.length; j++) {
            const cell = cells[j];
            const cellText = $(cell).text().trim();
            if (!cellText) continue;

            const modelIndex = j - 1; // because we skipped the first cell

            // Store raw value
            if (!models[modelIndex].raw) models[modelIndex].raw = {};
            models[modelIndex].raw![normalizedKey] = cellText;

            // Parse based on spec key
            switch (normalizedKey) {
              case 'weight': {
                const weight = parseWeightValue(cellText);
                if (weight.weight_g !== undefined) models[modelIndex].weight_g = weight.weight_g;
                if (weight.weight_oz !== undefined) models[modelIndex].weight_oz = weight.weight_oz;
                break;
              }
              case 'heel_mm':
              case 'forefoot_mm':
              case 'drop_mm': {
                const stack = parseStackValue(cellText);
                if (normalizedKey === 'heel_mm' && stack.heel_mm !== undefined) models[modelIndex].heel_mm = stack.heel_mm;
                if (normalizedKey === 'forefoot_mm' && stack.forefoot_mm !== undefined) models[modelIndex].forefoot_mm = stack.forefoot_mm;
                if (normalizedKey === 'drop_mm' && stack.drop_mm !== undefined) models[modelIndex].drop_mm = stack.drop_mm;
                break;
              }
              case 'price_usd': {
                const price = parsePriceValue(cellText);
                if (price.price_usd !== undefined) models[modelIndex].price_usd = price.price_usd;
                break;
              }
            }
          }
        }

        // Compute drop from heel and forefoot if missing
        models.forEach(model => {
          if (model.heel_mm !== null && model.forefoot_mm !== null && model.drop_mm === null) {
            model.drop_mm = model.heel_mm! - model.forefoot_mm!;
          }
        });

        // Determine which specs were found
        const sourceLabelsFound: string[] = [];
        const hasWeight = models.some(m => m.weight_g !== null && m.weight_g !== undefined);
        const hasStackOrDrop = models.some(m => m.heel_mm !== null && m.heel_mm !== undefined || 
                                                m.forefoot_mm !== null && m.forefoot_mm !== undefined || 
                                                m.drop_mm !== null && m.drop_mm !== undefined);
        const hasPrice = models.some(m => m.price_usd !== null && m.price_usd !== undefined);

        if (hasWeight) sourceLabelsFound.push('WEIGHT');
        if (hasStackOrDrop) sourceLabelsFound.push('STACK', 'DROP');
        if (hasPrice) sourceLabelsFound.push('PRICE');
        sourceLabelsFound.push('MULTI_TABLE');

        const confidence = Math.min(1.0, bestScore / 20); // simple heuristic

        return {
          data: {
            mode: 'multi_table',
            table_match_confidence: confidence,
            models,
            source_labels_found: sourceLabelsFound
          },
          tables_total: tables.length,
          candidates_found: candidatesFound
        };
      }

      parentPort.on('message', (data) => {
        try {
          const start = Date.now();
          const $ = cheerio.load(data.html);
          const body_text = $('body').text();
          const text_length = body_text.length;
          
          // Run multi-table detection
          const multiTableResult = extractMultiModelFromTables($, data.debugMode || false);
          
          const ms = Date.now() - start;
          
          parentPort.postMessage({
            ok: true,
            body_text,
            text_length,
            tables_total: multiTableResult.tables_total,
            candidates_found: multiTableResult.candidates_found,
            multi_table_data: multiTableResult.data,
            ms
          });
        } catch (error) {
          parentPort.postMessage({
            ok: false,
            error: error.message
          });
        }
      });
    `;

    const worker = new Worker(workerCode, { eval: true });
    worker.unref(); // Don't keep process alive for worker
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`DOM parse timeout after ${domParseTimeoutMs}ms`));
    }, domParseTimeoutMs);

    worker.on('message', (message) => {
      clearTimeout(timeout);
      worker.terminate();
      
      if (message.ok) {
        resolve({
          body_text: message.body_text,
          text_length: message.text_length,
          tables_total: message.tables_total,
          candidates_found: message.candidates_found,
          multi_table_data: message.multi_table_data
        });
      } else {
        reject(new Error(`Worker DOM parse error: ${message.error}`));
      }
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    worker.postMessage({ html, id, debugMode });
  });
}

async function backfillSpecs() {
  const supabase = createClient(supabaseUrl, serviceKey, {
    global: {
      fetch: fetchWithTimeout as any
    }
  });
  
  const batchSize = forceId ? 1 : parseInt(process.env.BATCH_SIZE || '10', 10);
  
  const query = supabase
    .from('JazzItJog_db')
    .select('ID, "Article link", "Title", "Content"');

  if (forceId) {
    query.eq('ID', forceId);
  } else {
    query
      .is('specs_json', null)
      .not('"Article link"', 'is', null);
  }

  const { data, error } = await query
    .order('ID', { ascending: true })
    .limit(batchSize);
  
  if (error) {
    logger.error(error, 'Error fetching rows for backfill');
    return;
  }

  // Diagnostic: Log batch details
  const nullLinkCount = data.filter(row => !row['Article link']).length;
  logger.info({
    selected_rows_count: data.length,
    min_ID: data.length > 0 ? Math.min(...data.map(row => row.ID)) : null,
    max_ID: data.length > 0 ? Math.max(...data.map(row => row.ID)) : null,
    null_link_count: nullLinkCount,
    ...(forceId ? { force_id: forceId } : {})
  }, 'Batch selection diagnostics');
  
  for (const row of data || []) {
    const url = row['Article link'];
    const urlHost = new URL(url).hostname;
    const content = row['Content'];
    const contentLen = content ? content.trim().length : 0;
    let source_used = '';
    let fetched_html_bytes = 0;
    let usingContent = false;
    let pageText = '';

    // Decide source
    if (contentLen >= minContentLen) {
      source_used = 'content';
      usingContent = true;
      pageText = content.trim();
      logger.info({
        ID: row.ID,
        step: 'using_content',
        content_len: contentLen
      }, 'Using Content field for extraction');
    } else {
      source_used = 'fetched_html';
      usingContent = false;
      logger.info({
        ID: row.ID,
        step: 'content_too_short_or_missing',
        content_len: contentLen,
        min_content_len: minContentLen
      }, 'Content field too short or missing, will fetch HTML');
    }

    // Initialize stage tracking for this row
    let stage: Stage = 'init';
    emitStage(stage);

    try {
      // Title prefilter (applies to both content and fetched HTML paths)
      stage = 'title_prefilter';
      emitStage(stage);
      const title = row['Title'] || '';
      const titlePrefilterResult = titlePrefilter(title);
      logger.info({
        ID: row.ID,
        step: 'title_prefilter_result',
        decision: titlePrefilterResult.decision,
        matched_negatives: titlePrefilterResult.matched_negatives,
        matched_positives: titlePrefilterResult.matched_positives,
        stage
      }, 'Title prefilter completed');

      // If title indicates non-shoe article, skip early
      if (titlePrefilterResult.decision === 'skip') {
        const specsJson = injectSourceTelemetry({
          mode: 'skipped' as const,
          reason: 'not_shoe_article',
          not_shoe_signal: 'title',
          title_prefilter: titlePrefilterResult,
          stage: 'title_prefilter'
        }, source_used, contentLen, fetched_html_bytes);
        
        let updateQuery = supabase
          .from('JazzItJog_db')
          .update({
            specs_json: specsJson,
            specs_extracted_at: new Date().toISOString(),
            specs_method: 'title_prefilter_skip'
          })
          .eq('ID', row.ID);

        if (!forceOverwrite) {
          updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
        }

        const { error: updateError } = await updateQuery;
        
        logger.info({
          ID: row.ID,
          step: 'title_prefilter_skip_update',
          update_success: !updateError
        }, 'Updated row as non-shoe article based on title');
        
        continue; // Skip to next article
      }

      if (usingContent) {
        // CONTENT PATH: Use the Content field, no HTML fetch
        fetched_html_bytes = 0;
        
        // Runtime guard: if source_used is "content", we must not fetch HTML
        if (source_used !== 'content') {
          throw new Error('BUG: source_used mismatch in content path');
        }

        // Skip directly to prefilter on the content text
        stage = 'prefilter';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'prefilter_start',
          stage,
          source_used
        }, 'Running shoe article prefilter on content');

        const prefilterResult = isLikelyShoeArticle(pageText);
        logger.info({
          ID: row.ID,
          step: 'prefilter_result',
          ok: prefilterResult.ok,
          score: prefilterResult.score,
          has_anchor: prefilterResult.has_anchor,
          pos_hits_count: prefilterResult.pos_hits.length,
          neg_hits_count: prefilterResult.neg_hits.length
        }, 'Shoe article prefilter completed');

        if (!prefilterResult.ok) {
          // Not a shoe article, skip
          const specsJson = injectSourceTelemetry({
            mode: 'skipped' as const,
            reason: 'not_shoe_article',
            stage: 'prefilter',
            prefilter_score: prefilterResult.score,
            prefilter_has_anchor: prefilterResult.has_anchor,
            prefilter_pos_hits: prefilterResult.pos_hits,
            prefilter_neg_hits: prefilterResult.neg_hits
          }, source_used, contentLen, fetched_html_bytes);
          
          let updateQuery = supabase
            .from('JazzItJog_db')
            .update({
              specs_json: specsJson,
              specs_extracted_at: new Date().toISOString(),
              specs_method: 'dom_not_shoe'
            })
            .eq('ID', row.ID);

          if (!forceOverwrite) {
            updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
          }

          const { error: updateError } = await updateQuery;
          
          logger.info({
            ID: row.ID,
            step: 'prefilter_skip_update',
            update_success: !updateError
          }, 'Updated row as non-shoe article');
          
          continue; // Skip to next article
        }

        // Windowing on content text
        stage = 'windowing';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'windowing_start',
          stage
        }, 'Building keyword windows on content');

        const windowingResult = buildKeywordWindows(pageText);
        logger.info({
          ID: row.ID,
          step: 'windowing_result',
          hit_count: windowingResult.telemetry.hit_count,
          window_count: windowingResult.telemetry.window_count,
          total_chars: windowingResult.telemetry.total_chars
        }, 'Windowing completed');

        // Extraction on windows
        stage = 'extract';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'extraction_start',
          stage
        }, 'Starting deterministic extraction on windows');

        const extractionResult = extractSpecsFromWindows(windowingResult.windows);
        logger.info({
          ID: row.ID,
          step: 'extraction_result',
          mode: extractionResult.mode,
          price_found: extractionResult.price_usd !== null && extractionResult.price_usd !== undefined,
          drop_found: extractionResult.drop_mm !== null && extractionResult.drop_mm !== undefined,
          weight_found: extractionResult.weight_g !== null && extractionResult.weight_g !== undefined
        }, 'Extraction completed');

        let specsJson: any = null;
        let specsMethod = 'none';

        // Note: In content path, there is no multi-table detection (requires DOM parsing)
        specsJson = injectSourceTelemetry({
          ...extractionResult,
          prefilter_score: prefilterResult.score,
          prefilter_has_anchor: prefilterResult.has_anchor,
          prefilter_pos_hits: prefilterResult.pos_hits,
          prefilter_neg_hits: prefilterResult.neg_hits
        }, source_used, contentLen, fetched_html_bytes);
        
        switch (extractionResult.mode) {
          case 'single':
            specsMethod = 'dom_windowed_single';
            break;
          case 'ambiguous_multi':
            specsMethod = 'dom_windowed_ambiguous';
            break;
          case 'skipped':
            specsMethod = 'dom_windowed_skipped';
            break;
        }
        
        logger.info({
          ID: row.ID,
          step: 'using_windowed_extraction',
          mode: extractionResult.mode
        }, 'Using windowed extraction results');

        // Supabase update
        stage = 'supabase_update';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'supabase_update_start',
          stage
        }, 'Starting Supabase update');

        let updateError: any = null;
        try {
          const updatePromise = (async () => {
            let updateQuery = supabase
              .from('JazzItJog_db')
              .update({
                specs_json: specsJson,
                specs_extracted_at: new Date().toISOString(),
                specs_method: specsMethod
              })
              .eq('ID', row.ID);

            if (!forceOverwrite) {
              updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
            }

            const { error } = await updateQuery;
            return { error };
          })();
          
          const result = await withTimeout(
            updatePromise,
            15000,
            'Supabase update timeout after 15 seconds'
          );
          updateError = result.error;
        } catch (timeoutError) {
          if (timeoutError instanceof Error && timeoutError.message.includes('Supabase update timeout')) {
            logger.error({
              ID: row.ID,
              step: 'supabase_update_timeout',
              stage
            }, 'Supabase update timeout (15 seconds)');
            updateError = timeoutError;
          } else {
            throw timeoutError;
          }
        }

        logger.info({
          ID: row.ID,
          step: 'supabase_update_done',
          update_success: !updateError,
          stage,
          ...(updateError ? { error_message: updateError.message } : {})
        }, 'Supabase update completed');

        stage = 'done';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'row_processing_end',
          stage
        }, 'Row processing completed');

      } else {
        // FETCHED HTML PATH: Fetch HTML and process normally
        // Runtime guard: ensure we are not in content mode
        if (source_used !== 'fetched_html') {
          throw new Error('BUG: source_used mismatch in fetched_html path');
        }

        // Step 1: Before fetch
        stage = 'fetch_html';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'fetch_html_start',
          url_host: urlHost,
          stage
        }, 'Fetching article HTML');
        
        // Step 2: Fetch with timeout
        let fetchResult;
        try {
          fetchResult = await fetchArticleHtml(url);
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.message.includes('HTTP fetch timeout')) {
            logger.error({
              ID: row.ID,
              step: 'fetch_html_timeout',
              url_host: urlHost
            }, 'HTTP fetch timeout (20 seconds)');
            continue; // Skip this article, don't crash whole run
          }
          throw fetchError;
        }
        
        // Step 3: After fetch
        fetched_html_bytes = fetchResult.length;
        logger.info({
          ID: row.ID,
          step: 'fetch_html_done',
          status_code: fetchResult.status,
          bytes_length: fetchResult.length
        }, 'HTML fetched successfully');

        // Step 4: Lightweight prefilter (for all articles)
        stage = 'prefilter_lightweight';
        emitStage(stage);
        const lightweightText = extractLightweightText(fetchResult.html, maxPrefilterChars);
        const lightweightPrefilterResult = isLikelyShoeArticle(lightweightText);
        logger.info({
          ID: row.ID,
          step: 'lightweight_prefilter_result',
          ok: lightweightPrefilterResult.ok,
          score: lightweightPrefilterResult.score,
          has_anchor: lightweightPrefilterResult.has_anchor,
          pos_hits_count: lightweightPrefilterResult.pos_hits.length,
          neg_hits_count: lightweightPrefilterResult.neg_hits.length
        }, 'Lightweight prefilter completed');

        // Step 5: Check HTML size before parsing
        stage = 'size_guard';
        emitStage(stage);
        const htmlLength = fetchResult.length;
        if (htmlLength > 600000) {
          // Large HTML guard - skip DOM parsing
          logger.info({
            ID: row.ID,
            step: 'dom_skipped_large_html',
            bytes_length: htmlLength,
            stage
          }, 'Skipping DOM parse due to large HTML');
          
          // Set skipped specs with prefilter telemetry
          const specsJson = injectSourceTelemetry({
            mode: 'skipped' as const,
            reason: 'large_html',
            stage,
            bytes_length: htmlLength,
            // Include prefilter telemetry from lightweight prefilter
            prefilter_score: lightweightPrefilterResult.score,
            prefilter_has_anchor: lightweightPrefilterResult.has_anchor,
            prefilter_pos_hits: lightweightPrefilterResult.pos_hits,
            prefilter_neg_hits: lightweightPrefilterResult.neg_hits
          }, source_used, contentLen, fetched_html_bytes);
          
          let updateQuery = supabase
            .from('JazzItJog_db')
            .update({
              specs_json: specsJson,
              specs_extracted_at: new Date().toISOString(),
              specs_method: 'dom_skipped_large_html'
            })
            .eq('ID', row.ID);

          if (!forceOverwrite) {
            updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
          }

          const { error: updateError } = await updateQuery;
          
          logger.info({
            ID: row.ID,
            update_success: !updateError,
            ...(updateError ? { error_message: updateError.message } : {})
          }, 'Row update diagnostics (skipped large HTML)');
          
          continue; // Skip to next article
        }
        
        // Step 5: Parse with Worker thread
        stage = 'dom_parse';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'dom_worker_start',
          stage
        }, 'Starting DOM worker parsing');
        
        let pageText: string;
        let textLength: number;
        let tablesTotal: number = 0;
        let candidatesFound: number = 0;
        let multiTableData: any = null;
        
        try {
          const result = await parseDomWithWorker(fetchResult.html, row.ID, forceId !== null);
          
          pageText = result.body_text;
          textLength = result.text_length;
          tablesTotal = result.tables_total;
          candidatesFound = result.candidates_found;
          multiTableData = result.multi_table_data;
          
          logger.info({
            ID: row.ID,
            step: 'dom_worker_done',
            text_length: textLength,
            stage
          }, 'DOM worker parsing completed');
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (err.message.includes('DOM parse timeout')) {
            logger.error({
              ID: row.ID,
              step: 'dom_worker_timeout',
              timeout_ms: domParseTimeoutMs,
              stage
            }, 'DOM parse timeout - terminating worker');
            
            // Set timeout skipped specs
            const specsJson = injectSourceTelemetry({
              mode: 'skipped' as const,
              reason: 'timeout',
              stage,
              timeout_ms: domParseTimeoutMs,
              bytes_length: htmlLength
            }, source_used, contentLen, fetched_html_bytes);
            
            let updateQuery = supabase
              .from('JazzItJog_db')
              .update({
                specs_json: specsJson,
                specs_extracted_at: new Date().toISOString(),
                specs_method: 'dom_parse_timeout'
              })
              .eq('ID', row.ID);

            if (!forceOverwrite) {
              updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
            }

            const { error: updateError } = await updateQuery;
            
            logger.info({
              ID: row.ID,
              update_success: !updateError,
              ...(updateError ? { error_message: updateError.message } : {})
            }, 'Row update diagnostics (DOM parse timeout)');
            
            continue; // Skip to next article
          } else {
            // Other DOM parsing error
            logger.error({
              ID: row.ID,
              step: 'dom_worker_error',
              error: err.message,
              stage
            }, 'DOM worker error');
            throw err;
          }
        }
        
        // Step 6: Shoe article prefilter
        stage = 'prefilter';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'prefilter_start',
          stage
        }, 'Running shoe article prefilter');
        
        const prefilterResult = isLikelyShoeArticle(pageText);
        logger.info({
          ID: row.ID,
          step: 'prefilter_result',
          ok: prefilterResult.ok,
          score: prefilterResult.score,
          has_anchor: prefilterResult.has_anchor,
          pos_hits_count: prefilterResult.pos_hits.length,
          neg_hits_count: prefilterResult.neg_hits.length
        }, 'Shoe article prefilter completed');
        
        if (!prefilterResult.ok) {
          // Not a shoe article, skip
          const specsJson = injectSourceTelemetry({
            mode: 'skipped' as const,
            reason: 'not_shoe_article',
            stage: 'prefilter',
            prefilter_score: prefilterResult.score,
            prefilter_has_anchor: prefilterResult.has_anchor,
            prefilter_pos_hits: prefilterResult.pos_hits,
            prefilter_neg_hits: prefilterResult.neg_hits
          }, source_used, contentLen, fetched_html_bytes);
          
          let updateQuery = supabase
            .from('JazzItJog_db')
            .update({
              specs_json: specsJson,
              specs_extracted_at: new Date().toISOString(),
              specs_method: 'dom_not_shoe'
            })
            .eq('ID', row.ID);

          if (!forceOverwrite) {
            updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
          }

          const { error: updateError } = await updateQuery;
          
          logger.info({
            ID: row.ID,
            step: 'prefilter_skip_update',
            update_success: !updateError
          }, 'Updated row as non-shoe article');
          
          continue; // Skip to next article
        }
        
        // Step 7: Windowing
        stage = 'windowing';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'windowing_start',
          stage
        }, 'Building keyword windows');
        
        const windowingResult = buildKeywordWindows(pageText);
        logger.info({
          ID: row.ID,
          step: 'windowing_result',
          hit_count: windowingResult.telemetry.hit_count,
          window_count: windowingResult.telemetry.window_count,
          total_chars: windowingResult.telemetry.total_chars
        }, 'Windowing completed');
        
        // Step 8: Extraction on windows
        stage = 'extract';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'extraction_start',
          stage
        }, 'Starting deterministic extraction on windows');
        
        const extractionResult = extractSpecsFromWindows(windowingResult.windows);
        logger.info({
          ID: row.ID,
          step: 'extraction_result',
          mode: extractionResult.mode,
          price_found: extractionResult.price_usd !== null && extractionResult.price_usd !== undefined,
          drop_found: extractionResult.drop_mm !== null && extractionResult.drop_mm !== undefined,
          weight_found: extractionResult.weight_g !== null && extractionResult.weight_g !== undefined
        }, 'Extraction completed');
        
        let specsJson: any = null;
        let specsMethod = 'none';
        
        // Step 9: Combine results (multi-table detection takes precedence if available)
        if (multiTableData && multiTableData.models && multiTableData.models.length >= 2) {
          // Use multi-table data
          specsJson = injectSourceTelemetry({
            ...multiTableData,
            mode: 'multi_table',
            prefilter_score: prefilterResult.score,
            prefilter_has_anchor: prefilterResult.has_anchor,
            prefilter_pos_hits: prefilterResult.pos_hits,
            prefilter_neg_hits: prefilterResult.neg_hits
          }, source_used, contentLen, fetched_html_bytes);
          specsMethod = 'dom_multi_table';
          logger.info({
            ID: row.ID,
            step: 'using_multi_table_data',
            models_count: multiTableData.models.length
          }, 'Using multi-table detection results');
        } else {
          // Use windowed extraction results
          specsJson = injectSourceTelemetry({
            ...extractionResult,
            prefilter_score: prefilterResult.score,
            prefilter_has_anchor: prefilterResult.has_anchor,
            prefilter_pos_hits: prefilterResult.pos_hits,
            prefilter_neg_hits: prefilterResult.neg_hits
          }, source_used, contentLen, fetched_html_bytes);
          
          switch (extractionResult.mode) {
            case 'single':
              specsMethod = 'dom_windowed_single';
              break;
            case 'ambiguous_multi':
              specsMethod = 'dom_windowed_ambiguous';
              break;
            case 'skipped':
              specsMethod = 'dom_windowed_skipped';
              break;
          }
          
          logger.info({
            ID: row.ID,
            step: 'using_windowed_extraction',
            mode: extractionResult.mode
          }, 'Using windowed extraction results');
        }
        
        // Step 10: Before Supabase update
        stage = 'supabase_update';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'supabase_update_start',
          stage
        }, 'Starting Supabase update');
        
        let updateError: any = null;
        try {
          // 15-second timeout for Supabase update
          const updatePromise = (async () => {
            let updateQuery = supabase
              .from('JazzItJog_db')
              .update({
                specs_json: specsJson,
                specs_extracted_at: new Date().toISOString(),
                specs_method: specsMethod
              })
              .eq('ID', row.ID);

            if (!forceOverwrite) {
              updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
            }

            const { error } = await updateQuery;
            return { error };
          })();
          
          const result = await withTimeout(
            updatePromise,
            15000,
            'Supabase update timeout after 15 seconds'
          );
          updateError = result.error;
        } catch (timeoutError) {
          if (timeoutError instanceof Error && timeoutError.message.includes('Supabase update timeout')) {
            logger.error({
              ID: row.ID,
              step: 'supabase_update_timeout',
              stage
            }, 'Supabase update timeout (15 seconds)');
            updateError = timeoutError;
          } else {
            throw timeoutError;
          }
        }

        logger.info({
          ID: row.ID,
          step: 'supabase_update_done',
          update_success: !updateError,
          stage,
          ...(updateError ? { error_message: updateError.message } : {})
        }, 'Supabase update completed');

        stage = 'done';
        emitStage(stage);
        logger.info({
          ID: row.ID,
          step: 'row_processing_end',
          stage
        }, 'Row processing completed');
      }
    } catch (error) {
      // Build failure JSON for child_error
      const errorObj = error as any;
      const failureJson = injectSourceTelemetry({
        mode: 'skipped' as const,
        reason: 'child_error' as const,
        stage,
        error_name: (errorObj && typeof errorObj === 'object' && 'name' in errorObj) ? errorObj.name : 'Error',
        error_code: (errorObj && typeof errorObj === 'object' && 'code' in errorObj) ? errorObj.code : null,
        message_hint: safeShortMessage(error)
      }, source_used, contentLen, fetched_html_bytes);

      // Log the error (safe logs only, no HTML/text)
      logger.error({ 
        ID: row.ID,
        step: 'child_error',
        stage,
        error_name: failureJson.error_name,
        error_code: failureJson.error_code
      }, 'Child process error');
      
      try {
        // Update Supabase with failure details
        stage = 'supabase_update';
        let updateQuery = supabase
          .from('JazzItJog_db')
          .update({
            specs_json: failureJson,
            specs_extracted_at: new Date().toISOString(),
            specs_method: 'dom_child_error'
          })
          .eq('ID', row.ID);

        if (!forceOverwrite) {
          updateQuery = updateQuery.or(`specs_json.is.null,specs_json->>mode.eq.skipped`);
        }

        const { error: updateError } = await updateQuery;
        
        if (updateError) {
          logger.error({
            ID: row.ID,
            step: 'supabase_update_failed',
            error_message: safeShortMessage(updateError)
          }, 'Failed to update Supabase with error details');
        } else {
          logger.info({
            ID: row.ID,
            step: 'supabase_update_success'
          }, 'Updated Supabase with error details');
        }
      } catch (updateErr) {
        logger.error({
          ID: row.ID,
          step: 'supabase_update_catch',
          error_message: safeShortMessage(updateErr)
        }, 'Failed to update Supabase (catch block)');
      }
      
      // If this is a FORCE_ID run, exit with code 1 after attempting DB update
      if (forceId) {
        logger.error({
          ID: row.ID,
          step: 'force_id_failure_exit',
          stage
        }, 'FORCE_ID processing failed, exiting with code 1');
        process.exit(1);
      }
      // Otherwise, continue to next article in batch mode
    }
  }
  
  // Step 13: After all rows processed
  logger.info({
    step: 'all_rows_processed',
    total_rows_processed: (data || []).length
  }, 'All rows processing completed');
  
  // If FORCE_ID was set, log completion and return (let Node exit naturally)
  if (forceId) {
    logger.info({
      step: 'force_id_done',
      ID: forceId
    }, 'FORCE_ID processing completed by child.');
  }
}

// Main execution
async function main() {
  // Strong fingerprint logs for runtime introspection
  console.log('CHILD_FINGERPRINT', JSON.stringify({
    file: __filename,
    cwd: process.cwd(),
    argv: process.argv,
    pid: process.pid,
    FORCE_ID: process.env.FORCE_ID,
    RUNNER_CHILD_FINGERPRINT: process.env.RUNNER_CHILD_FINGERPRINT,
    time: new Date().toISOString(),
  }));

  // Emit initial stage immediately at process start to avoid buffering issues
  emitStage('process_start');
  
  // Log script startup details
  logger.info({ cwd: process.cwd(), node: process.version }, 'Backfill script started');
  logger.info({ 
    FORCE_ID: process.env.FORCE_ID || null, 
    BATCH_SIZE: process.env.BATCH_SIZE || null,
    DOM_PARSE_TIMEOUT_MS: domParseTimeoutMs,
    MAX_WINDOW_TOTAL_CHARS,
    WINDOW_RADIUS
  }, 'Env vars seen by script');

  try {
    await backfillSpecs();
  } catch (error) {
    console.error('Backfill script failed with error:', error);
    logger.error(error, 'Backfill script failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
export { isLikelyShoeArticle };
