// ETL Pipeline for Staging (review before production)
// Same as run.ts but writes to staging_table instead of shoe_results

import "dotenv/config";
import { AirtableClient } from '../integrations/airtable';
import { getSupabaseClient } from '../integrations/supabase';
import { ingestFromAirtable } from './ingest';
import { extractFromArticle } from './extract';
import { normalizeSneakers } from './normalize';
import { buildShoeInputs } from './build';
import { insertShoesToStaging, notifyNewStagingItems } from './upsert/to_staging';
import { logger, createLogger } from '../core/logger';
import { getMetrics, resetMetrics } from '../core/metrics';
import type { PipelineConfig } from './run';

/**
 * Run ETL pipeline to staging table (for review)
 */
export async function runStagingPipeline(config: PipelineConfig) {
  const log = createLogger({
    level: config.logLevel || 'info',
    pretty: true,
  });

  log.info('🚀 ETL Pipeline (Staging) starting', {
    maxRecords: config.maxRecords,
    dryRun: config.dryRun,
  });

  resetMetrics();
  const metrics = getMetrics();

  try {
    // Step 1: Ingest articles from Airtable
    log.info('📥 Step 1: Ingesting NEW articles from Airtable');
    const airtableClient = new AirtableClient({
      apiKey: config.airtable.apiKey,
      baseId: config.airtable.baseId,
      tableName: config.airtable.tableName,
    });

    // Get Supabase client early to check for existing records
    const supabase = getSupabaseClient(config.database);

    // Fetch all articles from Airtable
    const ingestResult = await ingestFromAirtable(airtableClient, {
      maxRecords: config.maxRecords,
    });

    log.info('Airtable fetch completed', {
      total: ingestResult.total,
      fetched: ingestResult.articles.length,
    });

    if (ingestResult.articles.length === 0) {
      log.warn('No articles found in Airtable');
      metrics.finish();
      return { newItems: 0 };
    }

    // Filter out articles already in staging
    const { data: existingInStaging } = await supabase
      .from('staging_table')
      .select('airtable_id');

    const existingIds = new Set(
      existingInStaging?.map(r => r.airtable_id) || []
    );

    const newArticles = ingestResult.articles.filter(
      article => !existingIds.has(article.record_id)
    );

    log.info('Filtered for new articles', {
      total: ingestResult.articles.length,
      alreadyInStaging: existingIds.size,
      newToProcess: newArticles.length,
    });

    if (newArticles.length === 0) {
      log.info('✅ No new articles to process');
      metrics.finish();
      return { newItems: 0 };
    }

    // Step 2-6: Process each article
    log.info('⚙️ Step 2-6: Processing new articles');
    let totalNewItems = 0;

    for (const article of newArticles) {
      log.info('Processing article', {
        article_id: article.article_id,
        airtable_id: article.record_id,
        title: article.title,
      });

      try {
        // Step 2: Extract
        const extractResult = await extractFromArticle(
          {
            article_id: article.article_id,
            record_id: article.record_id,
            title: article.title,
            content: article.content,
            date: article.date,
            source_link: article.source_link,
          },
          config.openaiApiKey
        );

        if (extractResult.sneakers.length === 0) {
          log.warn('No sneakers extracted', { article_id: article.article_id });
          continue;
        }

        // Step 3: Normalize
        const normalized = normalizeSneakers(
          extractResult.sneakers,
          extractResult.titleAnalysis
        );

        if (normalized.length === 0) {
          log.warn('No sneakers after normalization', {
            article_id: article.article_id,
          });
          continue;
        }

        // Step 4: Build
        const shoes = buildShoeInputs(
          normalized,
          article.article_id,
          article.record_id,
          article.date,
          article.source_link
        );

        // Step 5: Insert to staging (not dry-run)
        if (!config.dryRun) {
          const upsertResult = await insertShoesToStaging(
            supabase,
            shoes,
            article.record_id
          );

          totalNewItems += upsertResult.created;

          log.info('Staging insert result', {
            article_id: article.article_id,
            created: upsertResult.created,
            successful: upsertResult.successful,
            failed: upsertResult.failed,
          });
        } else {
          log.info('DRY-RUN: Would insert to staging', {
            article_id: article.article_id,
            shoes: shoes.length,
          });
        }
      } catch (error) {
        log.error('Article processing failed', {
          article_id: article.article_id,
          error,
        });
        metrics.incrementArticlesFailed();
      }
    }

    // Send email notification if new items were added
    if (totalNewItems > 0 && !config.dryRun) {
      log.info('📧 Sending email notification', { newItems: totalNewItems });
      await notifyNewStagingItems(totalNewItems);
    }

    // Final summary
    metrics.finish();
    const finalMetrics = metrics.getSummary();

    log.info('✅ Pipeline completed', {
      newItems: totalNewItems,
      metrics: finalMetrics,
    });

    return { newItems: totalNewItems, metrics: finalMetrics };
  } catch (error) {
    log.error('Pipeline failed', { error });
    throw error;
  }
}

// CLI entry point
if (require.main === module) {
  const config: PipelineConfig = {
    airtable: {
      apiKey: process.env.AIRTABLE_API_KEY!,
      baseId: process.env.AIRTABLE_BASE_ID!,
      tableName: process.env.AIRTABLE_TABLE_NAME || 'Running Shoe Articles',
    },
    database: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    openaiApiKey: process.env.OPENAI_API_KEY!,
    logLevel: 'info',
  };

  runStagingPipeline(config).catch(error => {
    console.error('Pipeline failed:', error);
    process.exit(1);
  });
}
