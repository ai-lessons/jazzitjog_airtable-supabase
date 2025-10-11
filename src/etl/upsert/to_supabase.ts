// Upsert to Supabase

import type { ShoeInput } from '../../core/types';
import type { UpsertResult, UpsertSummary } from './types';
import type { SupabaseClient } from '../../integrations/supabase/client';
import { logger } from '../../core/logger';
import { getMetrics } from '../../core/metrics';
import PQueue from 'p-queue';

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

    // Upsert using composite unique constraint (airtable_id, brand_name, model)
    const { data, error } = await client
      .from('shoe_results')
      .upsert(shoe, {
        onConflict: 'airtable_id,brand_name,model',
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
    // Heuristic: treat as created if there was no prior row with same (airtable_id, brand_name, model)
    // The caller can optionally pass a precomputed set via symbol metadata in the shoe object (not exposed in type)
    // Fallback to true when airtable_id is null/undefined
    const existedBefore = Boolean((shoe as any).__existsBefore);
    const created = !existedBefore;

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

  const metrics = getMetrics();

  // Prefetch existing rows for present airtable_ids to detect created vs updated
  const airtableIds = Array.from(new Set(shoes.map(s => s.airtable_id).filter(Boolean))) as string[];
  const existedMap = new Set<string>(); // key: `${airtable_id}::${brand}::${model}`

  if (airtableIds.length > 0) {
    try {
      const { data, error } = await client
        .from('shoe_results')
        .select('airtable_id,brand_name,model')
        .in('airtable_id', airtableIds);
      if (error) {
        logger.warn('Prefetch existing rows failed', { error });
      } else if (data) {
        for (const r of data as any[]) {
          if (r.airtable_id && r.brand_name && r.model) {
            existedMap.add(`${r.airtable_id}::${(r.brand_name as string).toLowerCase()}::${(r.model as string).toLowerCase()}`);
          }
        }
      }
    } catch (e) {
      logger.warn('Prefetch existing rows threw error', { error: e });
    }
  }

  // Queue with bounded concurrency
  const queue = new PQueue({ concurrency: 5 });
  const results: UpsertResult[] = [];

  for (const shoe of shoes) {
    // annotate existence heuristic
    if (shoe.airtable_id && shoe.brand_name && shoe.model) {
      const key = `${shoe.airtable_id}::${shoe.brand_name.toLowerCase()}::${shoe.model.toLowerCase()}`;
      (shoe as any).__existsBefore = existedMap.has(key);
    }

    queue.add(async () => {
      const res = await upsertShoe(client, shoe);
      results.push(res);
    });
  }

  await queue.onIdle();

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
