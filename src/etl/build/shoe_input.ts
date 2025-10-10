// ShoeInput builder

import type { SneakerSpec } from '../../llm/types';
import type { ShoeInput } from '../../core/types';
import type { BuildContext, BuildResult } from './types';
import { generateModelKey } from './model_key';
import { logger } from '../../core/logger';

/**
 * Build ShoeInput from normalized SneakerSpec
 */
export function buildShoeInput(
  sneaker: SneakerSpec,
  context: BuildContext
): BuildResult {
  const warnings: string[] = [];

  // Generate model_key
  const model_key = generateModelKey(sneaker.brand_name, sneaker.model);

  // Validate required fields
  if (!sneaker.brand_name) {
    warnings.push('Missing brand_name');
  }

  if (!sneaker.model) {
    warnings.push('Missing model');
  }

  // Build ShoeInput
  const shoe: ShoeInput = {
    article_id: String(context.article_id), // Convert to string for DB
    airtable_id: context.airtable_id || null,
    brand_name: sneaker.brand_name || 'Unknown',
    model: sneaker.model || 'Unknown',
    model_key,

    // Physical specs
    heel_height: sneaker.heel_height,
    forefoot_height: sneaker.forefoot_height,
    drop: sneaker.drop,
    weight: sneaker.weight,
    price: sneaker.price,

    // Features
    upper_breathability: sneaker.upper_breathability,
    carbon_plate: sneaker.carbon_plate,
    waterproof: sneaker.waterproof,

    // Usage
    primary_use: sneaker.primary_use,
    cushioning_type: sneaker.cushioning_type,
    surface_type: sneaker.surface_type,
    foot_width: sneaker.foot_width,

    // Metadata
    additional_features: sneaker.additional_features,
    date: context.date || null,
    source_link: context.source_link || null,
  };

  logger.debug('Built ShoeInput', {
    model_key,
    brand: shoe.brand_name,
    model: shoe.model,
    warnings: warnings.length,
  });

  if (warnings.length > 0) {
    logger.warn('ShoeInput build warnings', { model_key, warnings });
  }

  return {
    shoe,
    model_key,
    warnings,
  };
}

/**
 * Build multiple ShoeInputs
 */
export function buildShoeInputs(
  sneakers: SneakerSpec[],
  context: BuildContext
): BuildResult[] {
  return sneakers.map(sneaker => buildShoeInput(sneaker, context));
}
