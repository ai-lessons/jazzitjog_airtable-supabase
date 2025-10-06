// Title analysis for context-aware extraction

import type { TitleAnalysis } from '../../llm/types';
import { logger } from '../../core/logger';
import { MODEL_TO_BRAND, BRAND_ALIASES, normalizeBrand as coreNormalizeBrand } from '../../core/mapping';

/**
 * Analyze article title to determine extraction context
 */
export function analyzeTitleForContext(title: string): TitleAnalysis {
  const normalized = title.toLowerCase().trim();

  // FIRST: Filter out non-shoe articles (headphones, watches, accessories, etc.)
  // This prevents wasting OpenAI tokens on irrelevant content
  const nonShoePatterns = [
    /headphone/i,
    /earbuds?/i,
    /watch(es)?/i,
    /sunglasses/i,
    /socks?/i,
    /hydration\s+pack/i,
    /vest/i,
    /jacket/i,
    /shorts?/i,
    /tights?/i,
    /massage\s+gun/i,
    /treadmill/i,
    /backpack/i,
    /belt/i,
    /armband/i,
    /hat/i,
    /cap/i,
    /gloves?/i,
    /bra/i,
    /nutrition/i,
    /energy\s+gel/i,
  ];

  if (nonShoePatterns.some(pattern => pattern.test(normalized))) {
    logger.info('Title analysis: irrelevant category detected (non-shoe)', { title });
    return {
      scenario: 'irrelevant',
      confidence: 0.0,
    };
  }

  // Try to detect specific model mention
  const specificMatch = detectSpecificModel(normalized);
  if (specificMatch) {
    logger.debug('Title analysis: specific model detected', specificMatch);
    return {
      scenario: 'specific',
      brand: specificMatch.brand,
      model: specificMatch.model,
      confidence: specificMatch.confidence,
    };
  }

  // Try to detect brand-only mention
  const brandMatch = detectBrandOnly(normalized);
  if (brandMatch) {
    logger.debug('Title analysis: brand-only detected', brandMatch);
    return {
      scenario: 'brand-only',
      brand: brandMatch.brand,
      confidence: brandMatch.confidence,
    };
  }

  // Default: general article (comparison, roundup, etc.)
  logger.debug('Title analysis: general article', { title });
  return {
    scenario: 'general',
    confidence: 0.8,
  };
}

/**
 * Detect specific model mention in title
 */
function detectSpecificModel(title: string): { brand: string; model: string; confidence: number } | null {
  // Check against known models
  for (const [model, brand] of Object.entries(MODEL_TO_BRAND)) {
    const modelLower = model.toLowerCase();

    if (title.includes(modelLower)) {
      return {
        brand,
        model,
        confidence: 0.9,
      };
    }
  }

  // Try pattern matching: "Brand Model" or "Model Brand"
  const patterns = [
    // Nike Vaporfly 3, Adidas Adizero Pro 3, Hoka Speedgoat 5 Trail Review, PUMA Velocity Nitro 4 Review
    /\b(nike|adidas|hoka|asics|brooks|saucony|new balance|salomon|altra|on|mizuno|puma|under armour|reebok|inov-?8|topo athletic|scott|dynafit|la sportiva|scarpa|merrell)\s+([a-z]+(?:\s+[a-z]+)?)\s+(\d+)(?:\s+(?:trail|road))?(?:\s+(?:review|test|hands-on|first look|vs|comparison)|\s*$)/i,

    // Nike Vomero Premium Review, Adidas Ultraboost Light Review (model without number but with review keyword)
    /\b(nike|adidas|hoka|asics|brooks|saucony|new balance|salomon|altra|on|mizuno|puma|under armour|reebok|inov-?8|topo athletic|scott|dynafit|la sportiva|scarpa|merrell)\s+([a-z]+(?:\s+[a-z]+){1,2})(?:\s+(?:review|test|hands-on|first look))/i,

    // Vaporfly 3 Review, Speedgoat 5 Test, Velocity Nitro 4 Review (model with number)
    /\b([a-z]+(?:\s+[a-z]+)?)\s+(\d+)(?:\s+(?:trail|road))?(?:\s+(?:review|test|hands-on|first look))/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      let brand: string | null = null;
      let model: string | null = null;

      if (match.length === 4) {
        // Pattern 1: Brand + Model + Number (Nike Vaporfly 3)
        brand = normalizeBrand(match[1]);
        model = `${match[2]} ${match[3]}`.trim();
      } else if (match.length === 3) {
        // Check if match[1] is a brand (Pattern 2: Brand + Model without number)
        const potentialBrand = match[1].toLowerCase();
        const brandsList = ['nike', 'adidas', 'hoka', 'asics', 'brooks', 'saucony', 'new balance', 'salomon', 'altra', 'on', 'mizuno', 'puma', 'under armour', 'reebok', 'inov8', 'topo athletic', 'scott', 'dynafit', 'la sportiva', 'scarpa', 'merrell'];

        if (brandsList.includes(potentialBrand)) {
          // Pattern 2: Brand + Model (Nike Vomero Premium)
          brand = normalizeBrand(match[1]);
          model = match[2].trim();
        } else {
          // Pattern 3: Model + Number (try to find brand in MODEL_TO_BRAND)
          model = `${match[1]} ${match[2]}`.trim();
          const modelKey = model.toLowerCase();
          brand = MODEL_TO_BRAND[modelKey] || null;
        }
      }

      if (brand && model) {
        return {
          brand,
          model,
          confidence: 0.8,
        };
      }
    }
  }

  return null;
}

/**
 * Detect brand-only mention in title
 */
function detectBrandOnly(title: string): { brand: string; confidence: number } | null {
  const brands = ['nike', 'adidas', 'hoka', 'asics', 'brooks', 'saucony', 'new balance', 'salomon', 'altra', 'on', 'mizuno', 'puma', 'under armour', 'reebok', 'inov8', 'topo athletic', 'scott', 'dynafit', 'la sportiva', 'scarpa', 'merrell'];

  for (const brand of brands) {
    if (title.includes(brand)) {
      // Check if title has brand-focus patterns (roundup articles)
      // Examples: "6 Adidas Running Shoes", "Best Nike Shoes", "Top Brooks Models"
      const hasBrandFocus = new RegExp(`\\b\\d+\\s+${brand}|best\\s+${brand}|top\\s+${brand}|${brand}\\s+(?:running\\s+)?shoes?`, 'i').test(title);

      if (hasBrandFocus) {
        return {
          brand: normalizeBrand(brand),
          confidence: 0.95,
        };
      }

      // Check if it's a specific model mention (brand + model name + number)
      // Pattern: Brand Name Number (e.g., "Nike Pegasus 40", "Brooks Ghost 15")
      const specificModelPattern = new RegExp(`${brand}\\s+([a-z]+)\\s+(\\d+)`, 'i');
      const hasSpecificModel = specificModelPattern.test(title);

      // Check if title contains known model names
      const hasModelName = Object.keys(MODEL_TO_BRAND).some(m => title.includes(m.toLowerCase()));

      // If no specific model found, it's brand-only
      if (!hasSpecificModel && !hasModelName) {
        return {
          brand: normalizeBrand(brand),
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}

/**
 * Normalize brand name using core mapping
 */
function normalizeBrand(brand: string): string {
  // Use core normalization which handles BRAND_ALIASES correctly
  const upperBrand = brand.toUpperCase();

  // Check if uppercase version is in aliases
  if (BRAND_ALIASES[upperBrand]) {
    return BRAND_ALIASES[upperBrand];
  }

  // Otherwise use core normalization
  return coreNormalizeBrand(brand);
}

/**
 * Check if sneaker matches title analysis
 */
export function matchesTitleAnalysis(
  sneaker: { brand_name: string | null; model: string | null },
  analysis: TitleAnalysis
): boolean {
  if (analysis.scenario === 'general') {
    return true; // No filtering for general articles
  }

  if (analysis.scenario === 'brand-only' && analysis.brand) {
    const brandMatch = sneaker.brand_name?.toLowerCase() === analysis.brand.toLowerCase();
    return brandMatch ?? false;
  }

  if (analysis.scenario === 'specific' && analysis.brand && analysis.model) {
    const brandMatch = sneaker.brand_name?.toLowerCase() === analysis.brand.toLowerCase();
    const modelMatch = sneaker.model?.toLowerCase().includes(analysis.model.toLowerCase());
    return (brandMatch && modelMatch) ?? false;
  }

  return true; // Default: keep sneaker
}
