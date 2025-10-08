"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Полный тест пайплайна от Airtable до Supabase
const fromAirtableToShoeInputs_1 = require("../pipeline/fromAirtableToShoeInputs");
const mapFromAirtable_1 = require("../pipeline/mapFromAirtable");
// Симуляция записей из Airtable с различными типами контента
const mockAirtableRecords = [
    {
        id: 'rec1',
        fields: {
            ID: 1001,
            Title: 'Nike Pegasus 40 Review - Best Daily Trainer',
            Content: `The Nike Pegasus 40 ($130) is an excellent daily training shoe. At 8.5 ounces (241 grams), it provides balanced cushioning with ReactX foam. The heel-to-toe drop measures 10mm with a 32mm heel height and 22mm forefoot height.`,
            'Article link': 'https://example.com/pegasus-40-review',
            'Time created': '2024-01-15T10:00:00.000Z'
        }
    },
    {
        id: 'rec2',
        fields: {
            ID: 1002,
            Title: 'Best Running Shoes 2024',
            Content: `Best Road Running Shoes: Brooks Ghost 17 ($140)
The Ghost 17 delivers smooth transitions with DNA LOFT v2 foam. Weight: 8.8 ounces (249 grams). Heel height: 30mm, forefoot: 20mm, drop: 10mm.

Best Trail Running Shoes: Hoka Speedgoat 6 ($155)
Trail running at its finest with 9.1 ounces (258 grams) and 5mm lugs for traction. 40mm heel stack height.`,
            'Article link': 'https://example.com/best-shoes-2024',
            'Time created': '2024-01-20T14:30:00.000Z'
        }
    },
    {
        id: 'rec3',
        fields: {
            ID: 1003,
            Title: 'Problematic Content Test',
            Content: `Nike moved the rocker point to create better transitions. Adidas added stretch panels for improved fit. Brooks has nailed the smooth transition between different phases.`,
            'Article link': 'https://example.com/problematic',
            'Time created': '2024-01-25T09:15:00.000Z'
        }
    }
];
async function testFullPipeline() {
    console.log('=== TESTING FULL AIRTABLE TO SUPABASE PIPELINE ===\n');
    // Тест 1: Прямой fromAirtableToShoeInputs
    console.log('1. Testing fromAirtableToShoeInputs...');
    const directResults = await (0, fromAirtableToShoeInputs_1.fromAirtableToShoeInputs)(mockAirtableRecords);
    console.log(`Direct extraction found ${directResults.length} models:`);
    directResults.forEach((shoe, i) => {
        console.log(`   ${i + 1}. ${shoe.brand_name} ${shoe.model} (Article ${shoe.article_id})`);
        console.log(`      Record ID: ${shoe.record_id}`);
        console.log(`      Model Key: ${shoe.model_key}`);
        console.log(`      Price: $${shoe.price}, Weight: ${shoe.weight}g`);
        console.log(`      Heights: ${shoe.heel_height}mm/${shoe.forefoot_height}mm, Drop: ${shoe.drop}mm`);
        console.log(`      Date: ${shoe.date}, Link: ${shoe.source_link}`);
        console.log('');
    });
    // Тест 2: Через mapFromAirtable (совместимый маппер)
    console.log('2. Testing mapFromAirtable (compatibility layer)...');
    const mappedResults = await (0, mapFromAirtable_1.mapFromAirtable)(mockAirtableRecords);
    console.log(`Mapped extraction found ${mappedResults.length} models:`);
    if (mappedResults.length !== directResults.length) {
        console.log(`⚠️  WARNING: Direct (${directResults.length}) vs Mapped (${mappedResults.length}) results differ!`);
    }
    // Тест 3: Проверка структуры данных для Supabase
    console.log('3. Validating data structure for Supabase...');
    const validationResults = directResults.map((shoe, i) => {
        const errors = [];
        // Обязательные поля
        if (!shoe.article_id)
            errors.push('Missing article_id');
        if (!shoe.record_id)
            errors.push('Missing record_id');
        if (!shoe.brand_name)
            errors.push('Missing brand_name');
        if (!shoe.model)
            errors.push('Missing model');
        if (!shoe.model_key)
            errors.push('Missing model_key');
        // Проверка типов
        if (shoe.price !== null && (typeof shoe.price !== 'number' || shoe.price < 40 || shoe.price > 500)) {
            errors.push(`Invalid price: ${shoe.price}`);
        }
        if (shoe.weight !== null && (typeof shoe.weight !== 'number' || shoe.weight < 100 || shoe.weight > 1000)) {
            errors.push(`Invalid weight: ${shoe.weight}`);
        }
        if (shoe.heel_height !== null && (typeof shoe.heel_height !== 'number' || shoe.heel_height < 10 || shoe.heel_height > 60)) {
            errors.push(`Invalid heel_height: ${shoe.heel_height}`);
        }
        if (shoe.drop !== null && (typeof shoe.drop !== 'number' || shoe.drop < 0 || shoe.drop > 20)) {
            errors.push(`Invalid drop: ${shoe.drop}`);
        }
        return { index: i + 1, model: `${shoe.brand_name} ${shoe.model}`, errors };
    });
    const validModels = validationResults.filter(r => r.errors.length === 0);
    const invalidModels = validationResults.filter(r => r.errors.length > 0);
    console.log(`✅ Valid models: ${validModels.length}/${directResults.length}`);
    if (invalidModels.length > 0) {
        console.log(`❌ Invalid models: ${invalidModels.length}`);
        invalidModels.forEach(invalid => {
            console.log(`   ${invalid.index}. ${invalid.model}: ${invalid.errors.join(', ')}`);
        });
    }
    // Тест 4: Проверка дедупликации
    console.log('\n4. Testing deduplication...');
    const articleGroups = new Map();
    directResults.forEach(shoe => {
        if (!articleGroups.has(shoe.article_id)) {
            articleGroups.set(shoe.article_id, []);
        }
        articleGroups.get(shoe.article_id).push(shoe);
    });
    articleGroups.forEach((shoes, articleId) => {
        const modelKeys = shoes.map(s => s.model_key);
        const uniqueKeys = new Set(modelKeys);
        if (modelKeys.length !== uniqueKeys.size) {
            console.log(`⚠️  Article ${articleId} has duplicate model_keys: ${modelKeys.join(', ')}`);
        }
        else {
            console.log(`✅ Article ${articleId}: ${shoes.length} unique models`);
        }
    });
    // Тест 5: Проверка маппинга полей
    console.log('\n5. Testing field mapping completeness...');
    const expectedFields = [
        'article_id', 'record_id', 'brand_name', 'model', 'model_key',
        'upper_breathability', 'carbon_plate', 'waterproof',
        'heel_height', 'forefoot_height', 'drop', 'weight', 'price',
        'primary_use', 'cushioning_type', 'surface_type', 'foot_width',
        'additional_features', 'date', 'source_link'
    ];
    if (directResults.length > 0) {
        const firstResult = directResults[0];
        const resultFields = Object.keys(firstResult);
        const missingFields = expectedFields.filter(field => !resultFields.includes(field));
        const extraFields = resultFields.filter(field => !expectedFields.includes(field));
        if (missingFields.length > 0) {
            console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
        }
        if (extraFields.length > 0) {
            console.log(`⚠️  Extra fields: ${extraFields.join(', ')}`);
        }
        if (missingFields.length === 0 && extraFields.length === 0) {
            console.log(`✅ All expected fields present`);
        }
    }
    // Резюме
    console.log('\n=== PIPELINE VALIDATION SUMMARY ===');
    console.log(`Total records processed: ${mockAirtableRecords.length}`);
    console.log(`Models extracted: ${directResults.length}`);
    console.log(`Valid models: ${validModels.length}/${directResults.length}`);
    if (invalidModels.length === 0 && directResults.length > 0) {
        console.log('🎉 PIPELINE VALIDATION PASSED');
        console.log('✅ Data extraction working correctly');
        console.log('✅ Field mapping complete');
        console.log('✅ Data validation successful');
    }
    else {
        console.log('⚠️  PIPELINE ISSUES DETECTED');
        if (invalidModels.length > 0) {
            console.log(`❌ ${invalidModels.length} models have validation errors`);
        }
        if (directResults.length === 0) {
            console.log('❌ No models extracted from test data');
        }
    }
    return {
        totalRecords: mockAirtableRecords.length,
        extractedModels: directResults.length,
        validModels: validModels.length,
        invalidModels: invalidModels.length,
        success: invalidModels.length === 0 && directResults.length > 0
    };
}
// Запустить тест
testFullPipeline().catch(console.error);
//# sourceMappingURL=pipeline_validation.js.map