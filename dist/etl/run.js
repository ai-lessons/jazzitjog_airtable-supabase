"use strict";
// ETL Pipeline Orchestrator
// This coordinates: ingest → extract → normalize → build → upsert
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
exports.runPipelineFromEnv = runPipelineFromEnv;
require("dotenv/config");
const airtable_1 = require("../integrations/airtable");
const supabase_1 = require("../integrations/supabase");
const ingest_1 = require("./ingest");
const extract_1 = require("./extract");
const normalize_1 = require("./normalize");
const build_1 = require("./build");
const upsert_1 = require("./upsert");
const logger_1 = require("../core/logger");
const metrics_1 = require("../core/metrics");
/**
 * Run the full ETL pipeline
 */
async function runPipeline(config) {
    // Initialize logger
    const log = (0, logger_1.createLogger)({
        level: config.logLevel || 'info',
        pretty: true,
    });
    log.info('🚀 ETL Pipeline starting', {
        maxRecords: config.maxRecords,
        dryRun: config.dryRun,
    });
    // Reset metrics
    (0, metrics_1.resetMetrics)();
    const metrics = (0, metrics_1.getMetrics)();
    try {
        // Step 1: Ingest articles from Airtable
        log.info('📥 Step 1: Ingesting articles from Airtable');
        const airtableClient = new airtable_1.AirtableClient({
            apiKey: config.airtable.apiKey,
            baseId: config.airtable.baseId,
            tableName: config.airtable.tableName,
        });
        const ingestResult = await (0, ingest_1.ingestFromAirtable)(airtableClient, {
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
                const extractResult = await (0, extract_1.extractFromArticle)({
                    article_id: article.article_id,
                    record_id: article.record_id,
                    title: article.title,
                    content: article.content,
                    date: article.date,
                    source_link: article.source_link,
                }, config.openaiApiKey);
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
                const normalizeResults = (0, normalize_1.normalizeSneakers)(extractResult.sneakers);
                log.debug('Normalization completed', {
                    article_id: article.article_id,
                    normalized: normalizeResults.length,
                });
                // Step 4: Build ShoeInput objects
                const buildResults = (0, build_1.buildShoeInputs)(normalizeResults.map(r => r.sneaker), {
                    article_id: article.article_id,
                    record_id: article.record_id,
                    date: article.date,
                    source_link: article.source_link,
                });
                log.debug('Build completed', {
                    article_id: article.article_id,
                    shoes: buildResults.length,
                });
                allShoes.push(...buildResults.map(r => r.shoe));
            }
            catch (error) {
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
        }
        else {
            log.info('💾 Step 7: Upserting to database');
            const supabaseClient = (0, supabase_1.getSupabaseClient)(config.database);
            const upsertSummary = await (0, upsert_1.upsertShoes)(supabaseClient, allShoes);
            log.info('Upsert completed', upsertSummary);
        }
        // Finalize metrics
        metrics.finish();
        log.info('✅ Pipeline completed successfully');
        log.info(metrics.getSummary());
    }
    catch (error) {
        log.error('Pipeline failed', { error });
        metrics.finish();
        throw error;
    }
}
/**
 * Run pipeline from environment variables
 */
async function runPipelineFromEnv() {
    const config = {
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
        logLevel: process.env.LOG_LEVEL || 'info',
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
//# sourceMappingURL=run.js.map