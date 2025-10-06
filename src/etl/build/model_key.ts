// Model key generation

import { logger } from '../../core/logger';

/**
 * Generate model_key from brand and model
 * Format: "brand model" in normalized lowercase (space-separated)
 *
 * Examples:
 * - Nike Vaporfly 3 → "nike vaporfly 3"
 * - Hoka Speedgoat 5 → "hoka speedgoat 5"
 * - Adidas Adizero Pro 3 → "adidas adizero pro 3"
 *
 * Note: Uses space separator to match existing shoe_results table format
 */
export function generateModelKey(brand: string | null, model: string | null): string {
  if (!brand || !model) {
    logger.warn('Cannot generate model_key: missing brand or model', { brand, model });
    return '';
  }

  const brandNorm = normalize(brand);
  const modelNorm = normalize(model);

  if (!brandNorm || !modelNorm) {
    return '';
  }

  return `${brandNorm} ${modelNorm}`;
}

/**
 * Normalize string: lowercase, collapse whitespace, trim
 * Removes diacritics and non-alphanumeric chars
 */
function normalize(str: string): string {
  // Strip diacritics
  const stripped = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  return stripped
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ') // Replace non-alphanumeric with space
    .trim()
    .replace(/\s+/g, ' ');       // Collapse multiple spaces
}
