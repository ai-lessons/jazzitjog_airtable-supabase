"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFromArticle = extractFromArticle;
require("dotenv/config");
const openai_1 = __importDefault(require("openai"));
const extractMultiModel_1 = require("./extractMultiModel");
async function extractFromArticle(args) {
    const { content } = args;
    // Try structured multi-model extraction first
    const structuredModels = (0, extractMultiModel_1.extractMultipleModels)(content);
    if (structuredModels.length > 0) {
        // Convert to expected format
        return {
            items: structuredModels.map(spec => ({
                brand_name: spec.brand_name,
                model: spec.model,
                upper_breathability: spec.upper_breathability,
                carbon_plate: spec.carbon_plate,
                waterproof: spec.waterproof,
                heel_height: spec.heel_height,
                forefoot_height: spec.forefoot_height,
                drop: spec.drop,
                weight: spec.weight,
                price: spec.price,
                primary_use: spec.primary_use,
                cushioning_type: spec.cushioning_type,
                surface_type: spec.surface_type,
                foot_width: spec.foot_width,
                additional_features: spec.additional_features,
                is_running_shoe: true,
            }))
        };
    }
    // Fall back to LLM extraction for unstructured content
    const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    const system = `
You extract running shoe specifications from long-form articles and comparisons.

OUTPUT: ONLY valid JSON:
type Item = {
  brand_name: string | null,
  model: string | null,

  upper_breathability: "low" | "medium" | "high" | null,
  carbon_plate: boolean | null,
  waterproof: boolean | null,

  heel_height: number | null,        // mm (stack height, NOT "platform height")
  forefoot_height: number | null,    // mm
  drop: number | null,               // mm (if heel & forefoot present, drop = heel - forefoot)

  weight: number | null,             // grams (round to int; if ounces given, convert to grams)

  /**
   * PRICE RULES (VERY IMPORTANT):
   * - price: return ONLY if a monetary price is explicitly stated (e.g. "$150", "€180", "GBP 165", "USD 140").
   * - Do NOT treat "10mm drop", "10/10 rating", percentages, or distances as price.
   * - If no currency or monetary context → price_usd = null.
   * - Valid USD range: 40–500. If outside → price_usd = null.
   * - Preferred: price_usd (number in USD). If in EUR (or other), convert to USD using an approximate average rate.
   */
  price_usd: number | null,
  price_currency: string | null,     // e.g. "USD","EUR","GBP" if detected
  price?: number | null,             // optional raw numeric as stated

  primary_use: string | null,        // e.g. "daily trainer", "tempo", "trail running"
  cushioning_type: "firm" | "balanced" | "max" | null,
  surface_type: "road" | "trail" | null,
  foot_width: "narrow" | "standard" | "wide" | null,

  additional_features: string | null,
  is_running_shoe: boolean
};
type Out = { items: Item[] };

General rules:
- If unsure → null (do not invent values).
- Parse numbers & units: mm/g; convert to pure numbers.
- For stack heights, ignore “platform height” values (they are not stack heights).
- waterproof = true if GTX/GORE-TEX or "water resistant" is explicitly present.
- upper_breathability ∈ {"low","medium","high"} or null.
- One article can cover multiple models (e.g., "Brooks Ghost 17 vs Ghost 16") — output each as a separate item.
- brand_name can be inferred from context; if unknown, leave null.
- Return ONLY the JSON (no extra text).
`.trim();
    const fewshot = `
EXAMPLE 1 (comparison):
Text mentions: "Brooks Ghost 17 vs Brooks Ghost 16", 10mm drop for 17, retail price $140, engineered mesh upper.
Return:
{
  "items": [
    {
      "brand_name": "Brooks",
      "model": "Ghost 17",
      "upper_breathability": "high",
      "carbon_plate": null,
      "waterproof": false,
      "heel_height": 30,
      "forefoot_height": 20,
      "drop": 10,
      "weight": 278,
      "price_usd": 140,
      "price_currency": "USD",
      "primary_use": "daily trainer",
      "cushioning_type": "balanced",
      "surface_type": "road",
      "foot_width": "standard",
      "additional_features": "engineered mesh upper, stable ride",
      "is_running_shoe": true
    },
    {
      "brand_name": "Brooks",
      "model": "Ghost 16",
      "upper_breathability": "medium",
      "carbon_plate": null,
      "waterproof": false,
      "heel_height": 30,
      "forefoot_height": 20,
      "drop": 10,
      "weight": 273,
      "price_usd": 130,
      "price_currency": "USD",
      "primary_use": "daily trainer",
      "cushioning_type": "firm",
      "surface_type": "road",
      "foot_width": "standard",
      "additional_features": "more durable outsole",
      "is_running_shoe": true
    }
  ]
}

EXAMPLE 2 (trail shoe; price in EUR):
"€150", GTX mentioned, weight 10.6 oz, stack 36/30 mm.
Return:
{
  "items": [
    {
      "brand_name": "Brooks",
      "model": "Caldera 8",
      "upper_breathability": "medium",
      "carbon_plate": false,
      "waterproof": true,
      "heel_height": 36,
      "forefoot_height": 30,
      "drop": 6,
      "weight": 300,
      "price_usd": 162,   // approximate USD conversion
      "price_currency": "EUR",
      "primary_use": "trail running",
      "cushioning_type": "max",
      "surface_type": "trail",
      "foot_width": "narrow",
      "additional_features": "gaiter attachment points, quick dry mesh",
      "is_running_shoe": true
    }
  ]
}
`.trim();
    const user = `Article text:
"""${content}"""

Follow the system rules and examples above.
Return the JSON object "Out" exactly.`.trim();
    const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: system },
            { role: "user", content: fewshot },
            { role: "user", content: user },
        ],
    });
    let parsed = { items: [] };
    try {
        parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    }
    catch { }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
        items: items.map((it) => {
            // numeric coercion and post-fixes
            const heel = toNum(it.heel_height);
            const fore = toNum(it.forefoot_height);
            let drop = toNum(it.drop);
            if (drop == null && heel != null && fore != null)
                drop = round2(heel - fore);
            const weight = toIntOrNull(it.weight);
            const { priceUsd } = normalizePriceToUSD(it.price_usd, it.price, it.price_currency, it.price_text);
            return {
                brand_name: it.brand_name ?? it.brand ?? null,
                model: it.model ?? null,
                upper_breathability: it.upper_breathability ?? null,
                carbon_plate: typeof it.carbon_plate === "boolean" ? it.carbon_plate : null,
                waterproof: typeof it.waterproof === "boolean" ? it.waterproof : null,
                heel_height: heel,
                forefoot_height: fore,
                drop,
                weight,
                price: priceUsd, // USD only
                primary_use: it.primary_use ?? null,
                cushioning_type: normalizeCushion(it.cushioning_type),
                surface_type: normalizeSurface(it.surface_type),
                foot_width: normalizeWidth(it.foot_width),
                additional_features: it.additional_features ?? null,
                is_running_shoe: it.is_running_shoe !== false,
            };
        }),
    };
}
// utils
function toNum(x) {
    if (x === null || x === undefined)
        return null;
    const s = String(x).replace(/[^\d.\-]/g, "");
    if (!s || s === "-" || s === ".")
        return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function toIntOrNull(x) {
    const n = toNum(x);
    if (n == null)
        return null;
    return Math.round(n);
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function normalizeCushion(x) {
    const s = String(x ?? "").toLowerCase();
    if (!s)
        return null;
    if (/(max|plush|high)/.test(s))
        return "max";
    if (/(firm|stiff)/.test(s))
        return "firm";
    if (/(balanced|moderate|middle|medium)/.test(s))
        return "balanced";
    return null;
}
function normalizeSurface(x) {
    const s = String(x ?? "").toLowerCase();
    if (/trail/.test(s))
        return "trail";
    if (/road|asphalt|pavement/.test(s))
        return "road";
    return null;
}
function normalizeWidth(x) {
    const s = String(x ?? "").toLowerCase();
    if (/narrow|slim/.test(s))
        return "narrow";
    if (/wide|2e|4e/.test(s))
        return "wide";
    if (/standard|regular|d width|medium/.test(s))
        return "standard";
    return null;
}
function normalizePriceToUSD(priceUsdRaw, priceRaw, currencyRaw, priceText) {
    const usdDirect = toNum(priceUsdRaw);
    if (usdDirect != null && isValidPriceUSD(usdDirect))
        return { priceUsd: round2(usdDirect) };
    const val = toNum(priceRaw);
    const code = normCurrency(currencyRaw) || detectCurrencyFromText(String(priceText ?? ""));
    if (val == null || !code)
        return { priceUsd: null };
    const usd = convertToUSD(val, code);
    if (usd == null)
        return { priceUsd: null };
    return { priceUsd: isValidPriceUSD(usd) ? round2(usd) : null };
}
function isValidPriceUSD(p) {
    return Number.isFinite(p) && p >= 40 && p <= 500;
}
function normCurrency(x) {
    const s = String(x ?? "").trim().toUpperCase();
    if (!s)
        return null;
    if (s === "$" || s === "USD" || s === "US$")
        return "USD";
    if (s === "€" || s === "EUR")
        return "EUR";
    if (s === "£" || s === "GBP")
        return "GBP";
    if (s === "JPY" || s === "¥")
        return "JPY";
    if (s === "CAD")
        return "CAD";
    if (s === "AUD")
        return "AUD";
    if (s === "CHF")
        return "CHF";
    if (s === "SEK")
        return "SEK";
    if (s === "NOK")
        return "NOK";
    if (s === "DKK")
        return "DKK";
    if (s === "PLN")
        return "PLN";
    return s.length === 3 ? s : null;
}
function detectCurrencyFromText(text) {
    const t = text.toUpperCase();
    if (/\$\s*\d/.test(t) || /\bUSD\b/.test(t))
        return "USD";
    if (/€\s*\d/.test(t) || /\bEUR\b/.test(t))
        return "EUR";
    if (/£\s*\d/.test(t) || /\bGBP\b/.test(t))
        return "GBP";
    if (/\bJPY\b/.test(t) || /¥\s*\d/.test(t))
        return "JPY";
    if (/\bCAD\b/.test(t))
        return "CAD";
    if (/\bAUD\b/.test(t))
        return "AUD";
    if (/\bCHF\b/.test(t))
        return "CHF";
    if (/\bSEK\b/.test(t))
        return "SEK";
    if (/\bNOK\b/.test(t))
        return "NOK";
    if (/\bDKK\b/.test(t))
        return "DKK";
    if (/\bPLN\b/.test(t))
        return "PLN";
    return null;
}
/** coarse average FX rates (no internet) */
function convertToUSD(amount, code) {
    switch (code) {
        case "USD": return amount;
        case "EUR": return amount * 1.08;
        case "GBP": return amount * 1.26;
        case "CAD": return amount * 0.74;
        case "AUD": return amount * 0.67;
        case "JPY": return amount * 0.0068;
        case "CHF": return amount * 1.10;
        case "SEK": return amount * 0.095;
        case "NOK": return amount * 0.095;
        case "DKK": return amount * 0.145;
        case "PLN": return amount * 0.25;
        default: return null;
    }
}
//# sourceMappingURL=extract.js.map