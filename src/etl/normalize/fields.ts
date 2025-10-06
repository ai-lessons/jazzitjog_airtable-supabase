// Field normalization functions

import type { SneakerSpec } from '../../llm/types';
import type { NormalizationChange } from './types';
import { normalizeBrand } from '../../core/mapping';
import { normStr, toNum, round2 } from '../../core/utils';
import { ozToGrams, convertToUSD, detectCurrency } from '../../core/units';
import { isValidUsdPrice, isValidHeight, isValidWeight, isValidDrop } from '../../core/validation';
import { logger } from '../../core/logger';

/**
 * Normalize brand name
 */
export function normalizeBrandName(
  brand: string | null,
  changes: NormalizationChange[]
): string | null {
  if (!brand) return null;

  const normalized = normalizeBrand(brand);

  if (normalized !== brand) {
    changes.push({
      field: 'brand_name',
      before: brand,
      after: normalized,
      reason: 'Applied brand normalization',
    });
  }

  return normalized;
}

/**
 * Normalize model name
 */
export function normalizeModelName(
  model: string | null,
  changes: NormalizationChange[]
): string | null {
  if (!model) return null;

  const cleaned = normStr(model);
  if (!cleaned) return null;

  // Remove common noise words
  let normalized = cleaned
    .replace(/\b(shoe|sneaker|running)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized !== model) {
    changes.push({
      field: 'model',
      before: model,
      after: normalized,
      reason: 'Removed noise words',
    });
  }

  return normalized;
}

/**
 * Normalize height (heel/forefoot)
 */
export function normalizeHeight(
  height: number | null,
  fieldName: 'heel_height' | 'forefoot_height',
  changes: NormalizationChange[],
  warnings: string[]
): number | null {
  if (height === null) return null;

  const num = toNum(height);
  if (num === null) {
    warnings.push(`Invalid ${fieldName}: ${height}`);
    return null;
  }

  // Validate range
  if (!isValidHeight(num)) {
    warnings.push(`${fieldName} out of range (10-60mm): ${num}mm`);
    return null;
  }

  const rounded = round2(num);

  if (rounded !== height) {
    changes.push({
      field: fieldName,
      before: height,
      after: rounded,
      reason: 'Rounded to 2 decimals',
    });
  }

  return rounded;
}

/**
 * Normalize drop
 */
export function normalizeDrop(
  drop: number | null,
  heelHeight: number | null,
  foreFootHeight: number | null,
  changes: NormalizationChange[],
  warnings: string[]
): number | null {
  // If drop is provided, validate it
  if (drop !== null) {
    const num = toNum(drop);
    if (num === null) {
      warnings.push(`Invalid drop: ${drop}`);
      return null;
    }

    if (!isValidDrop(num)) {
      warnings.push(`Drop out of range (0-15mm): ${num}mm`);
      return null;
    }

    return round2(num);
  }

  // Try to calculate from heel and forefoot
  if (heelHeight !== null && foreFootHeight !== null) {
    const calculated = round2(heelHeight - foreFootHeight);

    changes.push({
      field: 'drop',
      before: null,
      after: calculated,
      reason: 'Calculated from heel - forefoot',
    });

    return calculated;
  }

  return null;
}

/**
 * Normalize weight
 */
export function normalizeWeight(
  weight: number | null,
  changes: NormalizationChange[],
  warnings: string[]
): number | null {
  if (weight === null) return null;

  let num = toNum(weight);
  if (num === null) {
    warnings.push(`Invalid weight: ${weight}`);
    return null;
  }

  // Detect if weight is in oz (< 20) and convert to grams
  if (num < 20) {
    const grams = ozToGrams(num);
    changes.push({
      field: 'weight',
      before: num,
      after: grams,
      reason: 'Converted from oz to grams',
    });
    num = grams;
  }

  // Validate range
  if (!isValidWeight(num)) {
    warnings.push(`Weight out of range (150-400g): ${num}g`);
    return null;
  }

  return round2(num);
}

/**
 * Normalize price
 */
export function normalizePrice(
  price: number | null,
  currency: string | null,
  changes: NormalizationChange[],
  warnings: string[]
): number | null {
  if (price === null) return null;

  let num = toNum(price);
  if (num === null) {
    warnings.push(`Invalid price: ${price}`);
    return null;
  }

  // Detect currency and convert to USD if needed
  const detectedCurrency = currency ? currency.toUpperCase() : detectCurrency(num.toString());

  if (detectedCurrency && detectedCurrency !== 'USD') {
    const usd = convertToUSD(num, detectedCurrency);
    if (usd !== null) {
      changes.push({
        field: 'price',
        before: num,
        after: usd,
        reason: `Converted from ${detectedCurrency} to USD`,
      });
      num = usd;
    }
  }

  // Validate range
  if (!isValidUsdPrice(num)) {
    warnings.push(`Price out of range (40-500 USD): $${num}`);
    return null;
  }

  return round2(num);
}

/**
 * Normalize enum field
 */
export function normalizeEnum<T extends string>(
  value: T | null,
  allowedValues: readonly T[],
  fieldName: string,
  changes: NormalizationChange[],
  warnings: string[]
): T | null {
  if (value === null) return null;

  const normalized = value.toLowerCase().trim() as T;

  // Check if value is in allowed list
  if (!allowedValues.includes(normalized)) {
    warnings.push(`Invalid ${fieldName}: ${value} (allowed: ${allowedValues.join(', ')})`);
    return null;
  }

  if (normalized !== value) {
    changes.push({
      field: fieldName,
      before: value,
      after: normalized,
      reason: 'Normalized to lowercase',
    });
  }

  return normalized;
}

/**
 * Normalize boolean field
 */
export function normalizeBoolean(
  value: boolean | null,
  fieldName: string,
  changes: NormalizationChange[]
): boolean | null {
  if (value === null || value === undefined) return null;

  // Ensure it's actually boolean
  if (typeof value !== 'boolean') {
    const boolValue = Boolean(value);
    changes.push({
      field: fieldName,
      before: value,
      after: boolValue,
      reason: 'Converted to boolean',
    });
    return boolValue;
  }

  return value;
}
