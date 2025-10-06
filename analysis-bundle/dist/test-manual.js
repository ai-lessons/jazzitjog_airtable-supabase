"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/test-manual.ts - Manual test runner
const deduplication_1 = require("./utils/deduplication");
// Test data
const baseResult = {
    brand_name: 'nike',
    model: 'air max 270',
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
function runTests() {
    console.log('🧪 Starting manual deduplication tests...\n');
    // Test 1: generateSourceId
    console.log('📝 Test 1: generateSourceId');
    const sourceId1 = (0, deduplication_1.generateSourceId)('article123', 'https://example.com', 'content');
    console.log(`✅ With article_id: ${sourceId1}`);
    const sourceId2 = (0, deduplication_1.generateSourceId)('', 'https://www.example.com/path/', 'content');
    console.log(`✅ With normalized URL: ${sourceId2}`);
    const sourceId3 = (0, deduplication_1.generateSourceId)('', '', 'test content');
    console.log(`✅ With content hash: ${sourceId3}`);
    // Test 2: generateModelKey
    console.log('\n📝 Test 2: generateModelKey');
    const modelKey = (0, deduplication_1.generateModelKey)('Nike', 'Air Max 270');
    console.log(`✅ Model key: ${modelKey}`);
    // Test 3: In-document deduplication
    console.log('\n📝 Test 3: In-document deduplication');
    const duplicateModels = [
        {
            ...baseResult,
            brand_name: 'Nike',
            model: 'Air Max 270',
            weight: null,
            price: 150,
        },
        {
            ...baseResult,
            brand_name: 'nike', // different case
            model: 'air max 270',
            weight: 300,
            price: null,
        }
    ];
    const deduplicated = (0, deduplication_1.deduplicateInDocument)(duplicateModels);
    console.log(`✅ Original models: ${duplicateModels.length}, after deduplication: ${deduplicated.length}`);
    console.log(`✅ Merged weight: ${deduplicated[0].weight}, merged price: ${deduplicated[0].price}`);
    // Test 4: Payload richness comparison
    console.log('\n📝 Test 4: Payload richness comparison');
    const richPayload = { ...baseResult, weight: 300, price: 150, drop: 12 };
    const poorPayload = { ...baseResult, weight: 280 };
    const isRicher = (0, deduplication_1.isPayloadRicher)(richPayload, poorPayload);
    console.log(`✅ Rich payload is richer than poor: ${isRicher}`);
    // Test 5: Weight preferences (grams over oz)
    console.log('\n📝 Test 5: Weight preferences (grams over oz)');
    const ozPayload = { ...baseResult, weight: 10 }; // likely oz
    const gramsPayload = { ...baseResult, weight: 280 }; // likely grams
    const merged = (0, deduplication_1.mergeShoeResults)(ozPayload, gramsPayload);
    console.log(`✅ Merged weight (should prefer grams): ${merged.weight}`);
    console.log('\n🎉 All manual tests completed successfully!');
    // Test the actual scenario from requirements
    console.log('\n📝 Test (a): Same model twice in one Content → 1 merged object');
    const contentModels = [
        {
            ...baseResult,
            brand_name: 'Brooks',
            model: 'Ghost 17',
            weight: null,
            price: 140,
            additional_features: 'DNA Loft',
            source_id: 'content1'
        },
        {
            ...baseResult,
            brand_name: 'brooks',
            model: 'ghost 17',
            weight: 283,
            price: null,
            additional_features: 'DNA Loft v3 midsole technology',
            source_id: 'content1'
        }
    ];
    const mergedContent = (0, deduplication_1.deduplicateInDocument)(contentModels);
    console.log(`✅ Content models merged: ${contentModels.length} → ${mergedContent.length}`);
    console.log(`✅ Final model:`, {
        brand: mergedContent[0].brand_name,
        model: mergedContent[0].model,
        weight: mergedContent[0].weight,
        price: mergedContent[0].price,
        features: mergedContent[0].additional_features
    });
}
try {
    runTests();
}
catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
}
//# sourceMappingURL=test-manual.js.map