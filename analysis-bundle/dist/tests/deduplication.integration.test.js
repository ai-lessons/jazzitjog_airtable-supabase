"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/tests/deduplication.integration.test.ts
const globals_1 = require("@jest/globals");
const upsertResults_1 = require("../db/upsertResults");
const deduplication_1 = require("../utils/deduplication");
const client_1 = require("../db/client");
// Mock data for testing
const createTestShoeResult = (overrides = {}) => ({
    brand_name: 'nike',
    model: 'air max 270',
    primary_use: 'daily_trainer',
    cushioning_type: 'soft',
    heel_height: 32,
    forefoot_height: 20,
    weight: 300,
    foot_width: 'medium',
    drop: 12,
    surface_type: 'road',
    upper_breathability: 85,
    carbon_plate: false,
    waterproof: false,
    price: 150,
    additional_features: 'Air Max cushioning',
    source_link: 'https://example.com/article1',
    article_id: 'article1',
    date: '2023-01-01',
    source_id: 'source1',
    ...overrides
});
(0, globals_1.describe)('Deduplication Integration Tests', () => {
    // Clean up test data after each test
    (0, globals_1.afterEach)(async () => {
        try {
            await client_1.supabaseAdmin
                .from('shoe_results')
                .delete()
                .in('source_id', ['source1', 'source2', 'test_source']);
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    (0, globals_1.describe)('Test (a): Same model twice in one Content → 1 merged object', () => {
        (0, globals_1.it)('should merge duplicate models from same content', () => {
            const modelsFromContent = [
                createTestShoeResult({
                    weight: null,
                    price: 150,
                    additional_features: 'Air Max'
                }),
                createTestShoeResult({
                    weight: 300,
                    price: null,
                    additional_features: 'Air Max cushioning technology'
                })
            ];
            const deduplicated = (0, deduplication_1.deduplicateInDocument)(modelsFromContent);
            (0, globals_1.expect)(deduplicated).toHaveLength(1);
            (0, globals_1.expect)(deduplicated[0].weight).toBe(300); // merged from second
            (0, globals_1.expect)(deduplicated[0].price).toBe(150); // merged from first
            (0, globals_1.expect)(deduplicated[0].additional_features).toBe('Air Max cushioning technology'); // longer string
        });
    });
    (0, globals_1.describe)('Test (b): Existing row + poorer payload → skip', () => {
        (0, globals_1.it)('should skip when new payload is poorer', async () => {
            // First, insert a rich payload
            const richPayload = createTestShoeResult({
                weight: 300,
                price: 150,
                drop: 12,
                heel_height: 32,
                additional_features: 'Full Air Max cushioning technology'
            });
            const insertResults = await (0, upsertResults_1.upsertWithDeduplication)([richPayload]);
            (0, globals_1.expect)(insertResults.inserted).toBe(1);
            // Try to insert a poorer payload
            const poorPayload = createTestShoeResult({
                weight: 300, // same
                price: null, // less info
                drop: null, // less info
                heel_height: null, // less info
                additional_features: 'Air Max' // shorter
            });
            const upsertResults = await (0, upsertResults_1.upsertWithDeduplication)([poorPayload]);
            (0, globals_1.expect)(upsertResults.skipped).toBe(1);
            (0, globals_1.expect)(upsertResults.updated).toBe(0);
            (0, globals_1.expect)(upsertResults.inserted).toBe(0);
            // Verify the rich payload is still in the database
            const existing = await (0, upsertResults_1.existsByModelAndSource)(richPayload.brand_name, richPayload.model, richPayload.source_id);
            (0, globals_1.expect)(existing?.additional_features).toBe('Full Air Max cushioning technology');
        });
    });
    (0, globals_1.describe)('Test (c): Existing row + richer payload → update', () => {
        (0, globals_1.it)('should update when new payload is richer', async () => {
            // First, insert a basic payload
            const basicPayload = createTestShoeResult({
                weight: 300,
                price: null,
                drop: null,
                additional_features: 'Air Max'
            });
            const insertResults = await (0, upsertResults_1.upsertWithDeduplication)([basicPayload]);
            (0, globals_1.expect)(insertResults.inserted).toBe(1);
            // Try to insert a richer payload
            const richPayload = createTestShoeResult({
                weight: 300, // same
                price: 150, // new info
                drop: 12, // new info
                heel_height: 32, // new info
                additional_features: 'Full Air Max cushioning technology' // longer
            });
            const upsertResults = await (0, upsertResults_1.upsertWithDeduplication)([richPayload]);
            (0, globals_1.expect)(upsertResults.updated).toBe(1);
            (0, globals_1.expect)(upsertResults.inserted).toBe(0);
            (0, globals_1.expect)(upsertResults.skipped).toBe(0);
            // Verify the payload was updated
            const existing = await (0, upsertResults_1.existsByModelAndSource)(richPayload.brand_name, richPayload.model, richPayload.source_id);
            (0, globals_1.expect)(existing?.price).toBe(150);
            (0, globals_1.expect)(existing?.drop).toBe(12);
            (0, globals_1.expect)(existing?.additional_features).toBe('Full Air Max cushioning technology');
        });
    });
    (0, globals_1.describe)('Test (d): Same model, different source_id → new row', () => {
        (0, globals_1.it)('should insert new row for same model from different source', async () => {
            // Insert model from source1
            const modelFromSource1 = createTestShoeResult({
                source_id: 'source1',
                article_id: 'article1',
                source_link: 'https://example.com/article1'
            });
            const firstInsert = await (0, upsertResults_1.upsertWithDeduplication)([modelFromSource1]);
            (0, globals_1.expect)(firstInsert.inserted).toBe(1);
            // Insert same model from source2
            const modelFromSource2 = createTestShoeResult({
                source_id: 'source2',
                article_id: 'article2',
                source_link: 'https://example.com/article2',
                price: 160 // slightly different price
            });
            const secondInsert = await (0, upsertResults_1.upsertWithDeduplication)([modelFromSource2]);
            (0, globals_1.expect)(secondInsert.inserted).toBe(1);
            (0, globals_1.expect)(secondInsert.updated).toBe(0);
            (0, globals_1.expect)(secondInsert.skipped).toBe(0);
            // Verify both rows exist
            const fromSource1 = await (0, upsertResults_1.existsByModelAndSource)(modelFromSource1.brand_name, modelFromSource1.model, 'source1');
            const fromSource2 = await (0, upsertResults_1.existsByModelAndSource)(modelFromSource2.brand_name, modelFromSource2.model, 'source2');
            (0, globals_1.expect)(fromSource1).toBeTruthy();
            (0, globals_1.expect)(fromSource2).toBeTruthy();
            (0, globals_1.expect)(fromSource1?.price).toBe(150);
            (0, globals_1.expect)(fromSource2?.price).toBe(160);
        });
    });
    (0, globals_1.describe)('Reprocessing same Content → idempotent', () => {
        (0, globals_1.it)('should remain idempotent when reprocessing same content', async () => {
            const sourceId = (0, deduplication_1.generateSourceId)('article123', 'https://example.com/test', 'test content');
            const originalModels = [
                createTestShoeResult({
                    source_id: sourceId,
                    weight: 300,
                    price: 150
                }),
                createTestShoeResult({
                    brand_name: 'adidas',
                    model: 'ultraboost 22',
                    source_id: sourceId,
                    weight: 310,
                    price: 180
                })
            ];
            // First processing
            const firstResults = await (0, upsertResults_1.upsertWithDeduplication)(originalModels);
            (0, globals_1.expect)(firstResults.inserted).toBe(2);
            // Reprocess the same content (should be idempotent)
            const reprocessResults = await (0, upsertResults_1.upsertWithDeduplication)(originalModels);
            (0, globals_1.expect)(reprocessResults.skipped).toBe(2); // Should skip both as they're not richer
            (0, globals_1.expect)(reprocessResults.inserted).toBe(0);
            (0, globals_1.expect)(reprocessResults.updated).toBe(0);
            // Reprocess with slightly richer data
            const enrichedModels = originalModels.map(model => ({
                ...model,
                additional_features: 'Enhanced cushioning technology'
            }));
            const enrichedResults = await (0, upsertResults_1.upsertWithDeduplication)(enrichedModels);
            (0, globals_1.expect)(enrichedResults.updated).toBe(2); // Should update both
            (0, globals_1.expect)(enrichedResults.inserted).toBe(0);
            (0, globals_1.expect)(enrichedResults.skipped).toBe(0);
        });
    });
    (0, globals_1.describe)('Weight preferences: grams over oz', () => {
        (0, globals_1.it)('should prefer grams over oz conversions', async () => {
            // Insert with oz value
            const withOz = createTestShoeResult({
                weight: 10.6, // ~10.6 oz
                source_id: 'test_source'
            });
            await (0, upsertResults_1.upsertWithDeduplication)([withOz]);
            // Update with grams value
            const withGrams = createTestShoeResult({
                weight: 300, // 300g
                source_id: 'test_source'
            });
            const results = await (0, upsertResults_1.upsertWithDeduplication)([withGrams]);
            (0, globals_1.expect)(results.updated).toBe(1);
            // Verify grams value was kept
            const existing = await (0, upsertResults_1.existsByModelAndSource)(withGrams.brand_name, withGrams.model, 'test_source');
            (0, globals_1.expect)(existing?.weight).toBe(300);
        });
    });
});
//# sourceMappingURL=deduplication.integration.test.js.map