"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extractMultiModel_1 = require("./extractMultiModel");
// Sample content for testing
const sampleContent = `Best Road Running Shoes: Hoka Clifton 9 ($145)
At 8.9 ounces (252 grams), the Clifton 9 is light, and with 32 millimeters of stack height, it features a lot of cushion.

Best Road Running Shoes — Runner-Up: Nike Pegasus 41 ($155)
The Pegasus boasts ReactX foam and an Air Zoom unit in the heel. It is a versatile road running shoe.

Best Trail Running Shoes: Hoka Speedgoat 6 ($155)
Trail shoe at 9.8 ounces (280 grams), with 40-millimeter stack height at the heel (men's), 5-millimeter lugs, Vibram Megagrip.

Best Trail Running Shoes — Runner-Up: Nike Pegasus Trail 5 ($150)
Weighing 10.2 ounces (289 grams) with a 9.5-millimeter drop and 37-millimeter stack height at the heel. All Terrain Compound outsole; good for road-to-trail.`;
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
function runTests() {
    console.log('Running multi-model extraction tests...\n');
    // Test 1: detectModelHeadings should find 4 headings
    console.log('Test 1: detectModelHeadings should find 4 headings');
    const headings = (0, extractMultiModel_1.detectModelHeadings)(sampleContent);
    assert(headings.length === 4, `Expected 4 headings, got ${headings.length}`);
    assert(headings[0].brandModel === 'Hoka Clifton 9', `Expected 'Hoka Clifton 9', got '${headings[0].brandModel}'`);
    assert(headings[0].price === 145, `Expected price 145, got ${headings[0].price}`);
    console.log('✅ PASS\n');
    // Test 2: extractMultipleModels should extract 4 models
    console.log('Test 2: extractMultipleModels should extract 4 models with correct specs');
    const models = (0, extractMultiModel_1.extractMultipleModels)(sampleContent);
    assert(models.length === 4, `Expected 4 models, got ${models.length}`);
    // Hoka Clifton 9
    const clifton = models.find(m => m.model === 'Clifton 9');
    assert(clifton !== undefined, 'Hoka Clifton 9 not found');
    assert(clifton.brand_name === 'Hoka', `Expected brand 'Hoka', got '${clifton.brand_name}'`);
    assert(clifton.primary_use === 'road', `Expected primary_use 'road', got '${clifton.primary_use}'`);
    assert(clifton.surface_type === 'road', `Expected surface_type 'road', got '${clifton.surface_type}'`);
    assert(clifton.weight === 252, `Expected weight 252, got ${clifton.weight}`);
    assert(clifton.heel_height === 32, `Expected heel_height 32, got ${clifton.heel_height}`);
    assert(clifton.price === 145, `Expected price 145, got ${clifton.price}`);
    // Nike Pegasus Trail 5
    const pegasusTrail = models.find(m => m.model === 'Pegasus Trail 5');
    assert(pegasusTrail !== undefined, 'Nike Pegasus Trail 5 not found');
    assert(pegasusTrail.weight === 289, `Expected weight 289, got ${pegasusTrail.weight}`);
    assert(pegasusTrail.drop === 9.5, `Expected drop 9.5, got ${pegasusTrail.drop}`);
    assert(pegasusTrail.heel_height === 37, `Expected heel_height 37, got ${pegasusTrail.heel_height}`);
    assert(pegasusTrail.price === 150, `Expected price 150, got ${pegasusTrail.price}`);
    console.log('✅ PASS\n');
    // Test 3: Display all extracted models
    console.log('Test 3: All extracted models:');
    models.forEach((model, i) => {
        console.log(`${i + 1}. ${model.brand_name} ${model.model}`);
        console.log(`   Price: $${model.price}, Weight: ${model.weight}g`);
        console.log(`   Use: ${model.primary_use}, Surface: ${model.surface_type}`);
        console.log(`   Heights: ${model.heel_height}mm heel, ${model.forefoot_height}mm forefoot, ${model.drop}mm drop`);
        console.log('');
    });
    console.log('✅ All tests passed!');
}
// Manual test runner
if (require.main === module) {
    runTests();
}
//# sourceMappingURL=extractMultiModel.test.js.map