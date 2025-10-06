"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/tests/deduplication.test.ts
const globals_1 = require("@jest/globals");
const deduplication_1 = require("../utils/deduplication");
(0, globals_1.describe)('Deduplication Utils', () => {
    (0, globals_1.describe)('generateSourceId', () => {
        (0, globals_1.it)('should use article_id when available', () => {
            const sourceId = (0, deduplication_1.generateSourceId)('article123', 'https://example.com', 'content');
            (0, globals_1.expect)(sourceId).toBe('article123');
        });
        (0, globals_1.it)('should use normalized source_link when article_id is empty', () => {
            const sourceId = (0, deduplication_1.generateSourceId)('', 'https://www.example.com/path/', 'content');
            (0, globals_1.expect)(sourceId).toBe('example.com/path');
        });
        (0, globals_1.it)('should use sha1 hash of content when both article_id and source_link are empty', () => {
            const sourceId = (0, deduplication_1.generateSourceId)('', '', 'test content');
            (0, globals_1.expect)(sourceId).toBe('1eebdf4fdc9fc7bf283031b93f9aef3338de9052'); // sha1 of "test content"
        });
        (0, globals_1.it)('should throw error when all inputs are empty', () => {
            (0, globals_1.expect)(() => (0, deduplication_1.generateSourceId)('', '', '')).toThrow('Cannot generate source_id');
        });
    });
    (0, globals_1.describe)('generateModelKey', () => {
        (0, globals_1.it)('should create lowercase key with double colon separator', () => {
            const key = (0, deduplication_1.generateModelKey)('Nike', 'Air Max 270');
            (0, globals_1.expect)(key).toBe('nike::air max 270');
        });
        (0, globals_1.it)('should handle extra whitespace', () => {
            const key = (0, deduplication_1.generateModelKey)('  ADIDAS  ', '  Ultra Boost 22  ');
            (0, globals_1.expect)(key).toBe('adidas::ultra boost 22');
        });
    });
    (0, globals_1.describe)('isPayloadRicher', () => {
        const basePayload = {
            brand_name: 'nike',
            model: 'air max',
            primary_use: null,
            cushioning_type: null,
            heel_height: null,
            forefoot_height: null,
            weight: null,
            foot_width: null,
            drop: null,
            surface_type: null,
            upper_breathability: null,
            carbon_plate: null,
            waterproof: null,
            price: null,
            additional_features: null,
            source_link: 'test.com',
            article_id: '1',
            date: '2023-01-01'
        };
        (0, globals_1.it)('should return true when candidate has more non-null fields', () => {
            const existing = { ...basePayload };
            const candidate = { ...basePayload, weight: 300, price: 150 };
            (0, globals_1.expect)((0, deduplication_1.isPayloadRicher)(candidate, existing)).toBe(true);
        });
        (0, globals_1.it)('should return false when existing has more non-null fields', () => {
            const existing = { ...basePayload, weight: 300, price: 150, drop: 10 };
            const candidate = { ...basePayload, weight: 280 };
            (0, globals_1.expect)((0, deduplication_1.isPayloadRicher)(candidate, existing)).toBe(false);
        });
        (0, globals_1.it)('should prefer grams over oz for weight', () => {
            const existing = { ...basePayload, weight: 10 }; // likely oz
            const candidate = { ...basePayload, weight: 280 }; // likely grams
            (0, globals_1.expect)((0, deduplication_1.isPayloadRicher)(candidate, existing)).toBe(true);
        });
        (0, globals_1.it)('should weight important fields more heavily', () => {
            const existing = { ...basePayload, upper_breathability: 85 }; // 1 regular field
            const candidate = { ...basePayload, weight: 280 }; // 1 important field (weight=2)
            (0, globals_1.expect)((0, deduplication_1.isPayloadRicher)(candidate, existing)).toBe(true);
        });
    });
    (0, globals_1.describe)('mergeShoeResults', () => {
        const baseResult = {
            brand_name: 'nike',
            model: 'air max',
            primary_use: null,
            cushioning_type: null,
            heel_height: null,
            forefoot_height: null,
            weight: null,
            foot_width: null,
            drop: null,
            surface_type: null,
            upper_breathability: null,
            carbon_plate: null,
            waterproof: null,
            price: null,
            additional_features: null,
            source_link: 'test.com',
            article_id: '1',
            date: '2023-01-01'
        };
        (0, globals_1.it)('should prefer non-null values over null', () => {
            const existing = { ...baseResult, weight: null };
            const incoming = { ...baseResult, weight: 300 };
            const merged = (0, deduplication_1.mergeShoeResults)(existing, incoming);
            (0, globals_1.expect)(merged.weight).toBe(300);
        });
        (0, globals_1.it)('should prefer existing non-null values over incoming null', () => {
            const existing = { ...baseResult, price: 150 };
            const incoming = { ...baseResult, price: null };
            const merged = (0, deduplication_1.mergeShoeResults)(existing, incoming);
            (0, globals_1.expect)(merged.price).toBe(150);
        });
        (0, globals_1.it)('should prefer grams over oz for weight', () => {
            const existing = { ...baseResult, weight: 10 }; // likely oz
            const incoming = { ...baseResult, weight: 280 }; // likely grams
            const merged = (0, deduplication_1.mergeShoeResults)(existing, incoming);
            (0, globals_1.expect)(merged.weight).toBe(280);
        });
        (0, globals_1.it)('should prefer longer strings', () => {
            const existing = { ...baseResult, additional_features: 'DNA' };
            const incoming = { ...baseResult, additional_features: 'DNA Loft v3 midsole technology' };
            const merged = (0, deduplication_1.mergeShoeResults)(existing, incoming);
            (0, globals_1.expect)(merged.additional_features).toBe('DNA Loft v3 midsole technology');
        });
    });
    (0, globals_1.describe)('deduplicateInDocument', () => {
        (0, globals_1.it)('should merge models with same model_key', () => {
            const models = [
                {
                    brand_name: 'Nike',
                    model: 'Air Max 270',
                    weight: null,
                    price: 150,
                    primary_use: null,
                    cushioning_type: null,
                    heel_height: null,
                    forefoot_height: null,
                    foot_width: null,
                    drop: null,
                    surface_type: null,
                    upper_breathability: null,
                    carbon_plate: null,
                    waterproof: null,
                    additional_features: null,
                    source_link: 'test.com',
                    article_id: '1',
                    date: '2023-01-01'
                },
                {
                    brand_name: 'nike', // different case, same model
                    model: 'air max 270',
                    weight: 300,
                    price: null,
                    primary_use: null,
                    cushioning_type: null,
                    heel_height: null,
                    forefoot_height: null,
                    foot_width: null,
                    drop: null,
                    surface_type: null,
                    upper_breathability: null,
                    carbon_plate: null,
                    waterproof: null,
                    additional_features: null,
                    source_link: 'test.com',
                    article_id: '1',
                    date: '2023-01-01'
                }
            ];
            const result = (0, deduplication_1.deduplicateInDocument)(models);
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0].weight).toBe(300); // merged from second
            (0, globals_1.expect)(result[0].price).toBe(150); // merged from first
        });
        (0, globals_1.it)('should keep different models separate', () => {
            const models = [
                {
                    brand_name: 'Nike',
                    model: 'Air Max 270',
                    weight: 300,
                    price: null,
                    primary_use: null,
                    cushioning_type: null,
                    heel_height: null,
                    forefoot_height: null,
                    foot_width: null,
                    drop: null,
                    surface_type: null,
                    upper_breathability: null,
                    carbon_plate: null,
                    waterproof: null,
                    additional_features: null,
                    source_link: 'test.com',
                    article_id: '1',
                    date: '2023-01-01'
                },
                {
                    brand_name: 'Nike',
                    model: 'Air Max 90', // different model
                    weight: 280,
                    price: null,
                    primary_use: null,
                    cushioning_type: null,
                    heel_height: null,
                    forefoot_height: null,
                    foot_width: null,
                    drop: null,
                    surface_type: null,
                    upper_breathability: null,
                    carbon_plate: null,
                    waterproof: null,
                    additional_features: null,
                    source_link: 'test.com',
                    article_id: '1',
                    date: '2023-01-01'
                }
            ];
            const result = (0, deduplication_1.deduplicateInDocument)(models);
            (0, globals_1.expect)(result).toHaveLength(2);
        });
        (0, globals_1.it)('should handle empty array', () => {
            const result = (0, deduplication_1.deduplicateInDocument)([]);
            (0, globals_1.expect)(result).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=deduplication.test.js.map