// ETL Pipeline Orchestrator
// This coordinates: ingest → extract → normalize → build → upsert

import "dotenv/config";
import { AirtableClient } from '../integrations/airtable';
import { getSupabaseClient } from '../integrations/supabase';
import { ingestFromAirtable } from './ingest';
import { extractFromArticle } from './extract';
import { normalizeSneakers } from './normalize';
import { buildShoeInputs } from './build';
import { upsertShoes } from './upsert';
import { logger, createLogger } from '../core/logger';
import { getMetrics, resetMetrics } from '../core/metrics';
import type { DatabaseConfig } from '../integrations/supabase/client';

/**
 * Pipeline configuration
 */
export type PipelineConfig = {
  // Data source
  airtable: {
    apiKey: string;
    baseId: string;
    tableName: string;
  };
  database: DatabaseConfig;
  openaiApiKey: string;

  // Options
  maxRecords?: number;
  dryRun?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
};

/**
 * Run the full ETL pipeline
 */
export async function runPipeline(config: PipelineConfig) {
  // Initialize logger
  const log = createLogger({
    level: config.logLevel || 'info',
    pretty: true,
  });

  log.info('🚀 ETL Pipeline starting', {
    maxRecords: config.maxRecords,
    dryRun: config.dryRun,
  });

  // Reset metrics
  resetMetrics();
  const metrics = getMetrics();

  try {
    // Step 1: Ingest articles from Airtable
    log.info('📥 Step 1: Ingesting articles from Airtable');
    const airtableClient = new AirtableClient({
      apiKey: config.airtable.apiKey,
      baseId: config.airtable.baseId,
      tableName: config.airtable.tableName,
    });

    const ingestResult = await ingestFromAirtable(airtableClient, {
      maxRecords: config.maxRecords,
    });

    log.info('Ingest completed', {
      total: ingestResult.total,
      articles: ingestResult.articles.length,
      skipped: ingestResult.skipped,
    });

    if (ingestResult.articles.length === 0) {
      log.warn('No articles to process');
      metrics.finish();
      return;
    }

    // Step 2-6: Process each article
    log.info('⚙️ Step 2-6: Processing articles');
    const allShoes = [];

    for (const article of ingestResult.articles) {
      log.info('Processing article', {
        article_id: article.article_id,
        title: article.title,
      });

      try {
        // Step 2: Extract sneaker specs
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

        log.info('Extraction completed', {
          article_id: article.article_id,
          method: extractResult.extractionMethod,
          sneakers: extractResult.sneakers.length,
        });

        if (extractResult.sneakers.length === 0) {
          log.warn('No sneakers extracted', { article_id: article.article_id });
          continue;
        }

        // Step 3: Normalize sneakers
        const normalizeResults = normalizeSneakers(extractResult.sneakers);

        log.debug('Normalization completed', {
          article_id: article.article_id,
          normalized: normalizeResults.length,
        });

        // Step 4: Build ShoeInput objects
        const buildResults = buildShoeInputs(
          normalizeResults.map(r => r.sneaker),
          {
            article_id: article.article_id,
            record_id: article.record_id,
            date: article.date,
            source_link: article.source_link,
          }
        );

        log.debug('Build completed', {
          article_id: article.article_id,
          shoes: buildResults.length,
        });

        allShoes.push(...buildResults.map(r => r.shoe));
      } catch (error) {
        log.error('Article processing failed', {
          article_id: article.article_id,
          error,
        });
        metrics.incrementArticlesFailed();
      }
    }

    log.info('All articles processed', { totalShoes: allShoes.length });

    // Step 7: Upsert to database
    if (config.dryRun) {
      log.info('🏁 Dry run - skipping database upsert');
      log.info('Would upsert shoes', { count: allShoes.length });
    } else {
      log.info('💾 Step 7: Upserting to database');
      const supabaseClient = getSupabaseClient(config.database);

      const upsertSummary = await upsertShoes(supabaseClient, allShoes);

      log.info('Upsert completed', upsertSummary);
    }

    // Finalize metrics
    metrics.finish();

    log.info('✅ Pipeline completed successfully');
    log.info(metrics.getSummary());
  } catch (error) {
    log.error('Pipeline failed', { error });
    metrics.finish();
    throw error;
  }
}

/**
 * Run pipeline from environment variables
 */
export async function runPipelineFromEnv() {
  const config: PipelineConfig = {
    airtable: {
      apiKey: process.env.AIRTABLE_API_KEY || '',
      baseId: process.env.AIRTABLE_BASE_ID || '',
      tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
    },
    database: {
      url: process.env.SUPABASE_URL || '',
      serviceKey: process.env.SUPABASE_KEY || '',
    },
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    maxRecords: process.env.MAX_RECORDS ? parseInt(process.env.MAX_RECORDS) : undefined,
    dryRun: process.env.DRY_RUN === 'true',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  };

  // Validate config
  if (!config.airtable.apiKey || !config.airtable.baseId) {
    throw new Error('Missing Airtable configuration');
  }

  if (!config.database.url || !config.database.serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  if (!config.openaiApiKey) {
    throw new Error('Missing OpenAI API key');
  }

  await runPipeline(config);
}

if (require.main === module) {
  runPipelineFromEnv().catch(console.error);
}
