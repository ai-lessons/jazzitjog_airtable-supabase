"use strict";
// Centralized LLM prompts for sneaker extraction
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEW_SHOT_EXAMPLES = exports.BASE_SYSTEM_PROMPT = void 0;
exports.generateSystemPrompt = generateSystemPrompt;
exports.generateUserPrompt = generateUserPrompt;
/**
 * Base system prompt for sneaker extraction
 */
exports.BASE_SYSTEM_PROMPT = `
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
   * - price: return ONLY if a monetary price is explicitly stated (e.g. "$150", "�180", "GBP 165", "USD 140").
   * - Do NOT treat "10mm drop", "10/10 rating", percentages, or distances as price.
   * - If no currency or monetary context � price_usd = null.
   * - Valid USD range: 40500. If outside � price_usd = null.
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
- If unsure � null (do not invent values).
- Parse numbers & units: mm/g; convert to pure numbers.
- For stack heights, ignore "platform height" values (they are not stack heights).
- waterproof = true if GTX/GORE-TEX or "water resistant" is explicitly present.
- upper_breathability  {"low","medium","high"} or null.
- One article can cover multiple models (e.g., "Brooks Ghost 17 vs Ghost 16")  output each as a separate item.
- brand_name can be inferred from context; if unknown, leave null.
- Return ONLY the JSON (no extra text).
`.trim();
/**
 * Few-shot examples for better extraction quality
 */
exports.FEW_SHOT_EXAMPLES = `
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
"�150", GTX mentioned, weight 10.6 oz, stack 36/30 mm.
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
/**
 * Generate system prompt based on title analysis
 */
function generateSystemPrompt(titleAnalysis) {
    let specificInstructions = "";
    let filteringRules = "";
    if (titleAnalysis?.scenario === 'specific' && titleAnalysis.brand && titleAnalysis.model) {
        specificInstructions = `
CRITICAL FOCUS: The title mentions "${titleAnalysis.brand} ${titleAnalysis.model}".
Extract specifications ONLY for this exact model. IGNORE all other shoe mentions.`;
        filteringRules = `
STRICT FILTERING RULES:
- Extract ONLY "${titleAnalysis.brand} ${titleAnalysis.model}"
- IGNORE any other brands/models mentioned (they are comparison noise)
- If this specific model is not described with characteristics, return empty array`;
    }
    else if (titleAnalysis?.scenario === 'brand-only' && titleAnalysis.brand) {
        specificInstructions = `
BRAND FOCUS: The title focuses on "${titleAnalysis.brand}" brand.
Extract specifications ONLY for ${titleAnalysis.brand} models found in the content.`;
        filteringRules = `
BRAND FILTERING RULES:
- Extract ONLY ${titleAnalysis.brand} models
- IGNORE all other brands mentioned (they are comparison noise)
- Only include models with detailed specifications`;
    }
    else {
        specificInstructions = `
GENERAL ARTICLE: Extract all running shoe models that have detailed specifications.`;
        filteringRules = `
GENERAL FILTERING RULES:
- Extract models that have substantial characteristic data
- IGNORE brief mentions without specifications
- Focus on models that are actually reviewed/tested`;
    }
    return `${exports.BASE_SYSTEM_PROMPT}

${specificInstructions}

${filteringRules}

VALIDATION REQUIREMENTS - Only include if EXPLICITLY stated:
- heel/forefoot: Must have exact mm measurements (e.g. "32 mm in heel", "Stack Height 55mm")
- drop: Must be stated in mm or calculable from heel/forefoot
- weight: Must have exact grams/ounces measurements
- price: Must have exact price with currency symbol
- waterproof: Only if Gore-Tex, "waterproof", "water-resistant" mentioned
- cushioning:
  * "firm" if: "firmer side", "stiff", "firm cushioning", "responsive and firm"
  * "max" if: "max cushion", "plush", "soft", "highly cushioned", "maximal stack"
  * "balanced" if: "moderate", "balanced cushioning", "medium firmness"
- width:
  * "narrow" if: "narrow", "tight midfoot", "snug fit", "narrowest"
  * "wide" if: "wide", "roomy toe box", "wide fit", "spacious"
  * "standard" if: "standard width", "regular fit", "true to size"
- breathability:
  * "high" if: "very breathable", "excellent airflow", "breathable upper", "mesh upper"
  * "medium" if: "moderate breathability", "some ventilation"
  * "low" if: "not breathable", "GTX", "waterproof" (GTX typically reduces breathability)
- plate: Only if carbon fiber/plate explicitly mentioned

CRITICAL RULES:
- Heights in mm, weight in grams, price in USD
- Convert: 1 oz = 28.35g
- Price range: 40-500 USD, otherwise null
- Use null for ANY uncertain/unstated values
- Skip entries without both brand AND model
- Model names must be complete (e.g., "Evo SL" not "Evo")`;
}
/**
 * Generate user prompt for extraction
 */
function generateUserPrompt(content, title, titleAnalysis) {
    let instruction = "";
    if (titleAnalysis?.scenario === 'specific' && titleAnalysis.brand && titleAnalysis.model) {
        instruction = `Focus on extracting specifications for: ${titleAnalysis.brand} ${titleAnalysis.model}`;
    }
    else if (titleAnalysis?.scenario === 'brand-only' && titleAnalysis.brand) {
        instruction = `Focus on extracting ${titleAnalysis.brand} models with their specifications`;
    }
    else {
        instruction = `Extract all running shoe models with their specifications`;
    }
    const titlePart = title ? `Title: ${title}\n\n` : '';
    return `${titlePart}${instruction}

Content: ${content}`;
}
//# sourceMappingURL=prompts.js.map