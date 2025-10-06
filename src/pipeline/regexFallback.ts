// src/pipeline/regexFallback.ts
// Lightweight regex fallback to extract numbers when LLM is uncertain.
// Focus: stack heights (mm), drop (mm), weight (g/oz), price (USD/EUR/GBP → USD).
// IMPORTANT: we try to ignore "platform" heights.

type Heights = { heel?: number|null; forefoot?: number|null; drop?: number|null };
type PriceOut = { priceUsd?: number|null; currency?: string|null; raw?: number|null };

const FX: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.26,
  CAD: 0.74,
  AUD: 0.67,
  JPY: 0.0068,
  CHF: 1.10,
  SEK: 0.095,
  NOK: 0.095,
  DKK: 0.145,
  PLN: 0.25,
};

function isValidPriceUSD(p: number) { return Number.isFinite(p) && p >= 40 && p <= 500; }

function toNum(s: string): number | null {
  const x = Number(s.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function gramsFromOz(oz: number) { return Math.round(oz * 28.3495); }

function near(text: string, idx: number, radius = 24): string {
  return text.slice(Math.max(0, idx - radius), Math.min(text.length, idx + radius)).toLowerCase();
}

function looksLikePlatform(ctx: string): boolean {
  return /\bplatform\b/.test(ctx) || /\bstacked\b/.test(ctx);
}

// --- Heights (stack) ---
export function parseHeights(textRaw: string): Heights {
  const text = textRaw.replace(/\s+/g, " ");
  const out: Heights = {};

  // Common patterns: "36mm heel / 30mm forefoot", "stack: 36/30mm", "stack height 36 mm in heel and 30 mm in forefoot"
  const pairs = [
    /(?:stack|height|stack height)[^.\d]{0,20}(\d{2}(?:\.\d+)?)\s*mm[^.\d]{0,40}(\d{2}(?:\.\d+)?)\s*mm/gi,
    /(\d{2}(?:\.\d+)?)\s*\/\s*(\d{2}(?:\.\d+)?)\s*mm/gi,
  ];
  for (const re of pairs) {
    let m;
    while ((m = re.exec(text))) {
      const ctx = near(text, m.index);
      if (looksLikePlatform(ctx)) continue;
      const h = toNum(m[1]); const f = toNum(m[2]);
      if (h && f && h <= 60 && f <= 60) {
        out.heel ??= h; out.forefoot ??= f; out.drop ??= Math.round((h - f) * 100) / 100;
        return out;
      }
    }
  }

  // Single mentions: "heel stack 36mm", "forefoot 30mm"
  const heelRe = /(heel[^.\d]{0,12}|at the heel[^.\d]{0,12}|stack[^.\d]{0,12})\b(\d{2}(?:\.\d+)?)\s*mm/gi;
  const foreRe = /(forefoot[^.\d]{0,12}|at the forefoot[^.\d]{0,12}|toe[^.\d]{0,12})\b(\d{2}(?:\.\d+)?)\s*mm/gi;
  let m;
  while ((m = heelRe.exec(text))) {
    const ctx = near(text, m.index);
    if (looksLikePlatform(ctx)) continue;
    const h = toNum(m[2]);
    if (h && h <= 60) { out.heel ??= h; break; }
  }
  while ((m = foreRe.exec(text))) {
    const ctx = near(text, m.index);
    if (looksLikePlatform(ctx)) continue;
    const f = toNum(m[2]);
    if (f && f <= 60) { out.forefoot ??= f; break; }
  }

  // Drop explicitly: "drop of 6 mm", "6mm drop"
  const dropRe = /(?:drop[^.\d]{0,6}|)\b(\d{1,2}(?:\.\d+)?)\s*mm\s*(?:drop)?/gi;
  while ((m = dropRe.exec(text))) {
    const d = toNum(m[1]);
    if (d != null && d >= -5 && d <= 30) { out.drop ??= d; break; }
  }

  if (out.heel != null && out.forefoot != null && out.drop == null) {
    out.drop = Math.round((out.heel - out.forefoot) * 100) / 100;
  }
  return out;
}

// --- Weight ---
export function parseWeight(textRaw: string): number | null {
  const text = textRaw.replace(/\s+/g, " ");

  // grams: "weight 283 g", "283g"
  let m = /(\d{2,3}(?:\.\d+)?)\s*g\b/gi.exec(text);
  if (m) {
    const g = toNum(m[1]);
    if (g && g >= 80 && g <= 600) return Math.round(g);
  }

  // ounces: "10.6 oz"
  m = /(\d{1,2}(?:\.\d+)?)\s*oz\b/gi.exec(text);
  if (m) {
    const oz = toNum(m[1]);
    if (oz && oz > 2 && oz < 25) {
      const g = gramsFromOz(oz);
      if (g >= 80 && g <= 600) return g;
    }
  }
  return null;
}

// --- Price (→ USD) ---
export function parsePriceToUSD(textRaw: string): PriceOut {
  const text = textRaw.replace(/\s+/g, " ");

  // Prefer explicit monetary amounts with currency
  const money = [
    { re: /\$\s*(\d{2,3}(?:\.\d+)?)/g, cur: "USD" },
    { re: /€\s*(\d{2,3}(?:\.\d+)?)/g,  cur: "EUR" },
    { re: /£\s*(\d{2,3}(?:\.\d+)?)/g,  cur: "GBP" },
    { re: /\bUSD\s*(\d{2,3}(?:\.\d+)?)/gi, cur: "USD" },
    { re: /\bEUR\s*(\d{2,3}(?:\.\d+)?)/gi, cur: "EUR" },
    { re: /\bGBP\s*(\d{2,3}(?:\.\d+)?)/gi, cur: "GBP" },
  ];

  for (const { re, cur } of money) {
    const m = re.exec(text);
    if (!m) continue;
    const val = toNum(m[1] ?? "");
    if (val == null) continue;
    const usd = convertToUSD(val, cur);
    if (usd != null && isValidPriceUSD(usd)) {
      return { priceUsd: round2(usd), currency: cur, raw: val };
    }
  }

  // No explicit monetary context → null (don’t pick random “10”)
  return { priceUsd: null, currency: null, raw: null };
}

function convertToUSD(val: number, cur: string): number | null {
  const rate = FX[cur.toUpperCase()];
  return rate ? val * rate : null;
}
function round2(n: number) { return Math.round(n * 100) / 100; }
