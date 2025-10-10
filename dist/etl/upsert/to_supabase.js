"use strict";
// Upsert to Supabase
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertShoe = upsertShoe;
exports.upsertShoes = upsertShoes;
const logger_1 = require("../../core/logger");
const metrics_1 = require("../../core/metrics");
/**
 * Upsert a single shoe to database
 */
async function upsertShoe(client, shoe) {
    const metrics = (0, metrics_1.getMetrics)();
    try {
        logger_1.logger.debug('Upserting shoe', {
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
            logger_1.logger.error('Upsert failed', {
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
        }
        else {
            metrics.incrementRecordsUpdated();
        }
        metrics.incrementUpsertSuccessful();
        logger_1.logger.info('Upsert successful', {
            model_key: shoe.model_key,
            created,
        });
        return {
            model_key: shoe.model_key,
            success: true,
            created,
        };
    }
    catch (error) {
        logger_1.logger.error('Unexpected upsert error', {
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
async function upsertShoes(client, shoes) {
    logger_1.logger.info('Starting batch upsert', { count: shoes.length });
    const results = [];
    // Upsert one by one for better error handling
    for (const shoe of shoes) {
        const result = await upsertShoe(client, shoe);
        results.push(result);
    }
    // Build summary
    const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        created: results.filter(r => r.created).length,
        updated: results.filter(r => r.success && !r.created).length,
        errors: results
            .filter(r => !r.success && r.error)
            .map(r => ({ model_key: r.model_key, error: r.error })),
    };
    logger_1.logger.info('Batch upsert completed', summary);
    return summary;
}
//# sourceMappingURL=to_supabase.js.map