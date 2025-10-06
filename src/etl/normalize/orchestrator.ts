// Normalize orchestrator

import type { SneakerSpec } from '../../llm/types';
import type { NormalizeResult, NormalizationChange } from './types';
import {
  normalizeBrandName,
  normalizeModelName,
  normalizeHeight,
  normalizeDrop,
  normalizeWeight,
  normalizePrice,
  normalizeEnum,
  normalizeBoolean,
} from './fields';
import { logger } from '../../core/logger';

/**
 * Normalize a single sneaker spec
 */
export function normalizeSneaker(
  sneaker: SneakerSpec,
  options?: {
    currency?: string | null;
  }
): NormalizeResult {
  const changes: NormalizationChange[] = [];
  const warnings: string[] = [];

  logger.debug('Normalizing sneaker', {
    brand: sneaker.brand_name,
    model: sneaker.model,
  });

  // Normalize brand and model
  const brand_name = normalizeBrandName(sneaker.brand_name, changes);
  const model = normalizeModelName(sneaker.model, changes);

  // Normalize physical specs
  const heel_height = normalizeHeight(sneaker.heel_height, 'heel_height', changes, warnings);
  const forefoot_height = normalizeHeight(sneaker.forefoot_height, 'forefoot_height', changes, warnings);
  const drop = normalizeDrop(sneaker.drop, heel_height, forefoot_height, changes, warnings);
  const weight = normalizeWeight(sneaker.weight, changes, warnings);
  const price = normalizePrice(sneaker.price, options?.currency || null, changes, warnings);

  // Normalize enum fields
  const upper_breathability = normalizeEnum(
    sneaker.upper_breathability,
    ['low', 'medium', 'high'] as const,
    'upper_breathability',
    changes,
    warnings
  );

  const cushioning_type = normalizeEnum(
    sneaker.cushioning_type,
    ['firm', 'balanced', 'max'] as const,
    'cushioning_type',
    changes,
    warnings
  );

  const surface_type = normalizeEnum(
    sneaker.surface_type,
    ['road', 'trail'] as const,
    'surface_type',
    changes,
    warnings
  );

  const foot_width = normalizeEnum(
    sneaker.foot_width,
    ['narrow', 'standard', 'wide'] as const,
    'foot_width',
    changes,
    warnings
  );

  // Normalize boolean fields
  const carbon_plate = normalizeBoolean(sneaker.carbon_plate, 'carbon_plate', changes);
  const waterproof = normalizeBoolean(sneaker.waterproof, 'waterproof', changes);

  // Build normalized sneaker
  const normalized: SneakerSpec = {
    brand_name,
    model,
    heel_height,
    forefoot_height,
    drop,
    weight,
    price,
    upper_breathability,
    carbon_plate,
    waterproof,
    primary_use: sneaker.primary_use,
    cushioning_type,
    surface_type,
    foot_width,
    additional_features: sneaker.additional_features,
  };

  logger.debug('Normalization completed', {
    brand: normalized.brand_name,
    model: normalized.model,
    changes: changes.length,
    warnings: warnings.length,
  });

  if (warnings.length > 0) {
    logger.warn('Normalization warnings', {
      brand: normalized.brand_name,
      model: normalized.model,
      warnings,
    });
  }

  return {
    sneaker: normalized,
    changes,
    warnings,
  };
}

/**
 * Normalize multiple sneakers
 */
export function normalizeSneakers(
  sneakers: SneakerSpec[],
  options?: {
    currency?: string | null;
  }
): NormalizeResult[] {
  return sneakers.map(sneaker => normalizeSneaker(sneaker, options));
}
