// Title analysis for context-aware extraction

import type { TitleAnalysis } from '../../llm/types';
import { logger } from '../../core/logger';
import { MODEL_TO_BRAND, BRAND_ALIASES, normalizeBrand as coreNormalizeBrand } from '../../core/mapping';

/**
 * Check if text contains running shoe keywords (multilingual)
 */
function hasRunningShoeKeywords(text: string): boolean {
  const shoeKeywords = [
    // English
    /\bshoe/i,
    /\bsneaker/i,
    /\btrainer/i,
    /\bfootwear/i,
    /\brunning\s+shoe/i,
    /\btrail\s+shoe/i,
    /\brace\s+shoe/i,
    // Russian
    /кроссовк/i,
    /обувь/i,
    /беговая\s+обувь/i,
    // German
    /laufschuh/i,
    // French
    /chaussure/i,
    // Spanish
    /zapatilla/i,
    /calzado/i,
    // Portuguese
    /tênis/i,
  ];

  return shoeKeywords.some(pattern => pattern.test(text));
}

/**
 * Check if text contains review/comparison keywords
 */
function hasReviewKeywords(text: string): boolean {
  const reviewKeywords = [
    /\breview\b/i,
    /\btest\b/i,
    /\btester\b/i,
    /\bhands-on\b/i,
    /\bfirst look\b/i,
    /\b(?:vs|versus)\b/i,
    /\bcomparison\b/i,
    /\btested\b/i,
    /\binitial\b/i,
    /обзор/i, // Russian: review
    /тест/i, // Russian: test
  ];

  return reviewKeywords.some(pattern => pattern.test(text));
}

/**
 * Check if text contains non-shoe category keywords
 */
function hasNonShoeKeywords(text: string): boolean {
  const nonShoePatterns = [
    /smartwatch/i,
    /\bwatch(es)?\b/i,
    /fitness\s+tracker/i,
    /часы/i, // Russian: watch
    /headphone/i,
    /earbuds?/i,
    /sunglasses/i,
    /очки/i, // Russian: glasses
    /socks?/i,
    /носки/i, // Russian: socks
    /hydration\s+pack/i,
    /vest/i,
    /jacket/i,
    /куртка/i, // Russian: jacket
    /shorts?/i,
    /шорты/i, // Russian: shorts
    /tights?/i,
    /pants?/i,
    /leggings?/i,
    /штаны/i, // Russian: pants
    /massage\s+gun/i,
    /treadmill/i,
    /беговая\s+дорожка/i, // Russian: treadmill
    /bike\s+trainer/i,
    /cycling/i,
    /велосипед/i, // Russian: bicycle
    /backpack/i,
    /рюкзак/i, // Russian: backpack
    /belt/i,
    /armband/i,
    /hat/i,
    /cap/i,
    /шапка/i, // Russian: hat
    /gloves?/i,
    /перчатки/i, // Russian: gloves
    /bra/i,
    /sports\s+bra/i,
    /nutrition/i,
    /питание/i, // Russian: nutrition
    /energy\s+gel/i,
    /supplement/i,
    /protein/i,
    /recovery\s+drink/i,
  ];

  return nonShoePatterns.some(pattern => pattern.test(text));
}

/**
 * Check if content has minimum shoe characteristics (technical specs)
 */
function hasShoeCharacteristics(content: string): boolean {
  const contentLower = content.toLowerCase();

  // Check for common shoe specification keywords
  const specKeywords = [
    // Stack height / drop
    /stack\s+height/i,
    /heel\s+height/i,
    /forefoot\s+height/i,
    /\b\d+\s*mm\s+drop/i,
    /\bdrop\s*:\s*\d+/i,
    // Weight
    /weight\s*:\s*\d+/i,
    /\d+\s*oz/i,
    /\d+\s*g(?:rams)?/i,
    /вес\s*:\s*\d+/i, // Russian: weight
    // Cushioning / midsole
    /cushion/i,
    /midsole/i,
    /амортизация/i, // Russian: cushioning
    // Price
    /price\s*:\s*[$€£]/i,
    /\$\d{2,3}/i,
    /цена\s*:/i, // Russian: price
    // Carbon plate / technology
    /carbon\s+plate/i,
    /carbon\s+fiber/i,
    /карбоновая\s+пластина/i, // Russian: carbon plate
    // Gore-Tex / waterproof
    /gore-?tex/i,
    /gtx/i,
    /waterproof/i,
    /water-?resistant/i,
    /водонепроницаем/i, // Russian: waterproof
    // Outsole / traction
    /outsole/i,
    /traction/i,
    /grip/i,
    /подошва/i, // Russian: outsole
  ];

  // Count how many characteristic patterns found
  const matchCount = specKeywords.filter(pattern => pattern.test(contentLower)).length;

  // Need at least 3 different characteristics to consider it a shoe article
  return matchCount >= 3;
}

/**
 * Two-stage filtering: Title → Content
 * Returns true if article is about running shoes
 */
export function isRunningShoeArticle(title: string, content?: string): boolean {
  const titleLower = title.toLowerCase().trim();

  // ========== STAGE 1: Title Analysis ==========

  // 1.1: Check for NON-shoe keywords in title → REJECT immediately
  if (hasNonShoeKeywords(titleLower)) {
    logger.info('Article rejected: non-shoe keywords in title', { title });
    return false;
  }

  // 1.2: Check for SHOE keywords in title → ACCEPT immediately
  if (hasRunningShoeKeywords(titleLower)) {
    logger.info('Article accepted: shoe keywords in title', { title });
    return true;
  }

  // 1.3: Title is unclear (no shoe keywords, no non-shoe keywords)
  logger.debug('Title unclear, analyzing content...', { title });

  // ========== STAGE 2: Content Analysis ==========

  if (!content) {
    logger.info('Article rejected: unclear title, no content to analyze', { title });
    return false;
  }

  const contentLower = content.toLowerCase();

  // 2.1: Check for POSITIVE shoe indicators (keywords OR characteristics)
  const hasShoeKeywords = hasRunningShoeKeywords(contentLower);
  const hasCharacteristics = hasShoeCharacteristics(content);

  // Accept if: (SHOE keywords) OR (SHOE characteristics)
  if (hasShoeKeywords || hasCharacteristics) {
    logger.info('Article accepted: shoe indicators in content', {
      title,
      hasShoeKeywords,
      hasCharacteristics
    });
    return true;
  }

  // 2.2: No positive shoe indicators → check for explicit NON-shoe keywords
  // Only reject if we find clear non-shoe signals
  if (hasNonShoeKeywords(contentLower)) {
    logger.info('Article rejected: non-shoe keywords in content', { title });
    return false;
  }

  // 2.3: Unclear content (no positive signals, no negative signals) → REJECT by default
  logger.info('Article rejected: no clear indicators in content', { title });
  return false;
}

/**
 * Analyze article title to determine extraction context
 * NOTE: This is called AFTER isRunningShoeArticle() confirms it's a shoe article
 */
export function analyzeTitleForContext(title: string): TitleAnalysis {
  const normalized = title.toLowerCase().trim();

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
