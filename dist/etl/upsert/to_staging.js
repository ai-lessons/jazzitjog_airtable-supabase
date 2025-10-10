"use strict";
// Upsert to staging_table (for review before production)
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertToStaging = insertToStaging;
exports.insertShoesToStaging = insertShoesToStaging;
exports.notifyNewStagingItems = notifyNewStagingItems;
const logger_1 = require("../../core/logger");
const metrics_1 = require("../../core/metrics");
/**
 * Insert a shoe into staging_table
 * Note: staging uses INSERT (not UPSERT) because each ETL run should create new staging entries
 */
async function insertToStaging(client, shoe, airtableId) {
    const metrics = (0, metrics_1.getMetrics)();
    try {
        logger_1.logger.debug('Inserting to staging', {
            model_key: shoe.model_key,
            brand: shoe.brand_name,
            model: shoe.model,
            airtable_id: airtableId,
        });
        // Check if this specific shoe (airtable_id + brand + model) already exists in staging
        // Note: One article can have multiple shoes, so we need to check by brand+model too
        const { data: existing } = await client
            .from('staging_table')
            .select('id')
            .eq('airtable_id', airtableId)
            .eq('brand_name', shoe.brand_name)
            .eq('model', shoe.model)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found
        if (existing) {
            logger_1.logger.debug('Shoe already in staging, skipping', {
                airtable_id: airtableId,
                brand_name: shoe.brand_name,
                model: shoe.model,
            });
            return {
                model_key: shoe.model_key,
                success: true,
                created: false,
            };
        }
        // Prepare staging record (remove model_key, airtable_id, article_id - staging specific fields)
        const { model_key, airtable_id, article_id, ...stagingData } = shoe;
        // DEBUG: Log what we're trying to insert
        console.log('[DEBUG] Inserting shoe:', {
            model_key: shoe.model_key,
            brand: shoe.brand_name,
            model: shoe.model,
            hasData: Object.keys(stagingData).length
        });
        // Map ShoeInput fields to staging_table schema
        const stagingRecord = {
            airtable_id: airtableId,
            brand_name: stagingData.brand_name,
            model: stagingData.model,
            primary_use: stagingData.primary_use,
            surface_type: stagingData.surface_type,
            heel_height: stagingData.heel_height,
            forefoot_height: stagingData.forefoot_height,
            drop: stagingData.drop,
            weight: stagingData.weight,
            price: stagingData.price, // staging_table uses 'price' not 'price_usd'
            carbon_plate: stagingData.carbon_plate,
            waterproof: stagingData.waterproof,
            date: stagingData.date, // staging_table uses 'date' not 'date_published'
            source_link: stagingData.source_link,
            cushioning_type: stagingData.cushioning_type,
            foot_width: stagingData.foot_width,
            upper_breathability: stagingData.upper_breathability,
            additional_features: stagingData.additional_features,
            is_running_shoe: true, // Default to true for running shoe pipeline
        };
        // Insert into staging_table
        const { data, error } = await client
            .from('staging_table')
            .insert(stagingRecord)
            .select()
            .single();
        if (error) {
            console.error('❌ STAGING INSERT ERROR:', {
                model_key: shoe.model_key,
                airtable_id: airtableId,
                error_message: error.message,
                error_details: error.details,
                error_hint: error.hint,
                error_code: error.code,
            });
            logger_1.logger.error('Staging insert failed', {
                model_key: shoe.model_key,
                airtable_id: airtableId,
                error_message: error.message,
                error_details: error.details,
                error_hint: error.hint,
                error_code: error.code,
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
        logger_1.logger.info('Staging insert successful', {
            model_key: shoe.model_key,
            airtable_id: airtableId,
        });
        return {
            model_key: shoe.model_key,
            success: true,
            created: true,
        };
    }
    catch (error) {
        logger_1.logger.error('Unexpected staging insert error', {
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
async function insertShoesToStaging(client, shoes, airtableId) {
    logger_1.logger.info('Starting batch insert to staging', {
        count: shoes.length,
        airtable_id: airtableId,
    });
    const results = [];
    // Insert one by one for better error handling
    for (const shoe of shoes) {
        const result = await insertToStaging(client, shoe, airtableId);
        results.push(result);
    }
    // Build summary
    const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        created: results.filter(r => r.created).length,
        updated: 0, // No updates in staging, only inserts
        errors: results
            .filter(r => !r.success && r.error)
            .map(r => ({ model_key: r.model_key, error: r.error })),
    };
    logger_1.logger.info('Batch staging insert completed', summary);
    return summary;
}
/**
 * Send email notification about new staging items
 */
async function notifyNewStagingItems(count) {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await fetch(`${siteUrl}/api/notify-approval`, {
            method: 'GET',
        });
        logger_1.logger.info('Email notification sent', { newItems: count });
    }
    catch (error) {
        logger_1.logger.error('Failed to send email notification', { error });
        // Don't fail the pipeline if email fails
    }
}
//# sourceMappingURL=to_staging.js.map