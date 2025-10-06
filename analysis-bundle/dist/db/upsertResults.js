"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.existsByModelAndSource = existsByModelAndSource;
exports.upsertWithDeduplication = upsertWithDeduplication;
exports.upsertResultsBatch = upsertResultsBatch;
// src/db/upsertResults.ts
const client_1 = require("./client");
const deduplication_1 = require("../utils/deduplication");
/**
 * Check if a model exists in the database by model_key and source_id
 */
async function existsByModelAndSource(brandName, model, sourceId) {
    const modelKey = (0, deduplication_1.generateModelKey)(brandName, model);
    const { data, error } = await client_1.supabaseAdmin
        .from('shoe_results')
        .select('*')
        .eq('brand_name', brandName.toLowerCase())
        .eq('model', model.toLowerCase())
        .eq('source_id', sourceId)
        .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Error checking model existence: ${error.message}`);
    }
    return data;
}
/**
 * Upsert with deduplication logic.
 * Before inserting, check if model exists with same source_id.
 * If exists: update only if new payload is strictly richer, else skip.
 * If not exists: insert.
 */
async function upsertWithDeduplication(rows) {
    if (!rows?.length)
        return { inserted: 0, updated: 0, skipped: 0 };
    const results = {
        inserted: 0,
        updated: 0,
        skipped: 0,
    };
    for (const row of rows) {
        if (!row.source_id) {
            console.warn('Skipping row without source_id:', row);
            results.skipped++;
            continue;
        }
        try {
            const existing = await existsByModelAndSource(row.brand_name, row.model, row.source_id);
            if (existing) {
                // Record exists - check if new payload is richer
                if ((0, deduplication_1.isPayloadRicher)(row, existing)) {
                    const { error } = await client_1.supabaseAdmin
                        .from('shoe_results')
                        .update(row)
                        .eq('brand_name', existing.brand_name)
                        .eq('model', existing.model)
                        .eq('source_id', existing.source_id);
                    if (error) {
                        throw new Error(`Update failed: ${error.message}`);
                    }
                    results.updated++;
                }
                else {
                    // Skip - existing payload is richer or equal
                    results.skipped++;
                }
            }
            else {
                // Record doesn't exist - insert
                const { error } = await client_1.supabaseAdmin
                    .from('shoe_results')
                    .insert([row]);
                if (error) {
                    throw new Error(`Insert failed: ${error.message}`);
                }
                results.inserted++;
            }
        }
        catch (error) {
            console.error(`Error processing row:`, row, error);
            results.skipped++;
        }
    }
    return results;
}
/**
 * Upsert пачкой. Разрезает rows на куски (по умолчанию 500), чтобы не упереться в лимиты.
 * Идемпотентно по (article_id, source_link) — дубликатов не будет.
 *
 * @deprecated Use upsertWithDeduplication for new deduplication logic
 */
async function upsertResultsBatch(rows, chunk = 500) {
    if (!rows?.length)
        return;
    for (let i = 0; i < rows.length; i += chunk) {
        const part = rows.slice(i, i + chunk);
        const { error } = await client_1.supabaseAdmin
            .from('shoe_results')
            .upsert(part, { onConflict: 'article_id,source_link' });
        if (error) {
            // В реальном пайплайне лучше не бросать ошибку на весь процесс,
            // а логировать её в processing_errors и продолжать.
            throw new Error(`Upsert failed on chunk [${i}-${i + part.length - 1}]: ${error.message}`);
        }
    }
}
//# sourceMappingURL=upsertResults.js.map