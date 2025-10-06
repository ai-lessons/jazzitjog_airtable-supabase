// Upsert to staging_table (for review before production)

import type { ShoeInput } from '../../core/types';
import type { UpsertResult, UpsertSummary } from './types';
import type { SupabaseClient } from '../../integrations/supabase/client';
import { logger } from '../../core/logger';
import { getMetrics } from '../../core/metrics';

/**
 * Insert a shoe into staging_table
 * Note: staging uses INSERT (not UPSERT) because each ETL run should create new staging entries
 */
export async function insertToStaging(
  client: SupabaseClient,
  shoe: ShoeInput,
  airtableId: string
): Promise<UpsertResult> {
  const metrics = getMetrics();

  try {
    logger.debug('Inserting to staging', {
      model_key: shoe.model_key,
      brand: shoe.brand_name,
      model: shoe.model,
      airtable_id: airtableId,
    });

    // Check if this airtable_id already exists in staging
    const { data: existing } = await client
      .from('staging_table')
      .select('id')
      .eq('airtable_id', airtableId)
      .single();

    if (existing) {
      logger.debug('Airtable record already in staging, skipping', {
        airtable_id: airtableId,
      });

      return {
        model_key: shoe.model_key,
        success: true,
        created: false,
      };
    }

    // Prepare staging record (remove model_key, record_id - staging specific fields)
    const { model_key, record_id, ...stagingData } = shoe;

    // Insert into staging_table
    const { data, error } = await client
      .from('staging_table')
      .insert({
        ...stagingData,
        airtable_id: airtableId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Staging insert failed', {
        model_key: shoe.model_key,
        airtable_id: airtableId,
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

    metrics.incrementRecordsCreated();
    metrics.incrementUpsertSuccessful();

    logger.info('Staging insert successful', {
      model_key: shoe.model_key,
      airtable_id: airtableId,
    });

    return {
      model_key: shoe.model_key,
      success: true,
      created: true,
    };
  } catch (error) {
    logger.error('Unexpected staging insert error', {
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
 * Insert multiple shoes into staging_table
 */
export async function insertShoesToStaging(
  client: SupabaseClient,
  shoes: ShoeInput[],
  airtableId: string
): Promise<UpsertSummary> {
  logger.info('Starting batch insert to staging', {
    count: shoes.length,
    airtable_id: airtableId,
  });

  const results: UpsertResult[] = [];

  // Insert one by one for better error handling
  for (const shoe of shoes) {
    const result = await insertToStaging(client, shoe, airtableId);
    results.push(result);
  }

  // Build summary
  const summary: UpsertSummary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    created: results.filter(r => r.created).length,
    updated: 0, // No updates in staging, only inserts
    errors: results
      .filter(r => !r.success && r.error)
      .map(r => ({ model_key: r.model_key, error: r.error! })),
  };

  logger.info('Batch staging insert completed', summary);

  return summary;
}

/**
 * Send email notification about new staging items
 */
export async function notifyNewStagingItems(count: number): Promise<void> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    await fetch(`${siteUrl}/api/notify-approval`, {
      method: 'GET',
    });

    logger.info('Email notification sent', { newItems: count });
  } catch (error) {
    logger.error('Failed to send email notification', { error });
    // Don't fail the pipeline if email fails
  }
}
