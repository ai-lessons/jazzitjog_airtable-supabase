// test_deduplication.js
const { refineModelName } = require('./src/transform/fields.ts');

// Тестовые случаи для нормализации моделей
const testCases = [
  { brand: "Norda", model: "001A Multi Tester", expected: "001A" },
  { brand: "Inov8", model: "Trailtalon Max 120 Mile", expected: "Trailtalon Max" },
  { brand: "On", model: "Running Cloudsurfer Max Multi Tester", expected: "Cloudsurfer Max" },
  { brand: "Decathlon", model: "Kiprun KD900X LD+", expected: "KD900X LD+" },
  { brand: "ASICS", model: "Gel-Nimbus 25 Test", expected: "Gel-Nimbus 25" },
  { brand: "Nike", model: "Running Pegasus 40", expected: "Pegasus 40" }
];

console.log("Тестирование нормализации названий моделей:");
console.log("=" * 50);

testCases.forEach(({ brand, model, expected }, index) => {
  try {
    const result = refineModelName(brand, model);
    const status = result === expected ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${status}`);
    console.log(`   Brand: ${brand}`);
    console.log(`   Input: "${model}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Result: "${result}"`);
    console.log("");
  } catch (error) {
    console.log(`${index + 1}. ❌ ERROR`);
    console.log(`   Brand: ${brand}`);
    console.log(`   Input: "${model}"`);
    console.log(`   Error: ${error.message}`);
    console.log("");
  }
});