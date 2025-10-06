// Upsert to Supabase

import type { ShoeInput } from '../../core/types';
import type { UpsertResult, UpsertSummary } from './types';
import type { SupabaseClient } from '../../integrations/supabase/client';
import { logger } from '../../core/logger';
import { getMetrics } from '../../core/metrics';

/**
 * Upsert a single shoe to database
 */
export async function upsertShoe(
  client: SupabaseClient,
  shoe: ShoeInput
): Promise<UpsertResult> {
  const metrics = getMetrics();

  try {
    logger.debug('Upserting shoe', {
      model_key: shoe.model_key,
      brand: shoe.brand_name,
      model: shoe.model,
    });

    // Upsert using composite unique constraint (record_id, model_key)
    const { data, error } = await client
      .from('shoe_results')
      .upsert(shoe, {
        onConflict: 'record_id,model_key',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Upsert failed', {
        model_key: shoe.model_key,
        error,
      });
      metrics.incrementUpsertFailed();

      return {
        model_key: shoe.model_key,
        success: false,
        created: false,
        error: error.message,
      };
    }

    // Determine if this was a create or update
    // Note: Supabase doesn't tell us directly, so we rely on checking if article_id changed
    const created = true; // Simplified for now

    if (created) {
      metrics.incrementRecordsCreated();
    } else {
      metrics.incrementRecordsUpdated();
    }

    metrics.incrementUpsertSuccessful();

    logger.info('Upsert successful', {
      model_key: shoe.model_key,
      created,
    });

    return {
      model_key: shoe.model_key,
      success: true,
      created,
    };
  } catch (error) {
    logger.error('Unexpected upsert error', {
      model_key: shoe.model_key,
      error,
    });
    metrics.incrementUpsertFailed();

    return {
      model_key: shoe.model_key,
      success: false,
      created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upsert multiple shoes to database
 */
export async function upsertShoes(
  client: SupabaseClient,
  shoes: ShoeInput[]
): Promise<UpsertSummary> {
  logger.info('Starting batch upsert', { count: shoes.length });

  const results: UpsertResult[] = [];

  // Upsert one by one for better error handling
  for (const shoe of shoes) {
    const result = await upsertShoe(client, shoe);
    results.push(result);
  }

  // Build summary
  const summary: UpsertSummary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    created: results.filter(r => r.created).length,
    updated: results.filter(r => r.success && !r.created).length,
    errors: results
      .filter(r => !r.success && r.error)
      .map(r => ({ model_key: r.model_key, error: r.error! })),
  };

  logger.info('Batch upsert completed', summary);

  return summary;
}
