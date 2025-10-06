// Тест для проверки смешивания данных между моделями в одной статье
import { extractMultipleModels } from '../llm/extractMultiModel';

const multiModelContent = `Best Road Running Shoes: Brooks Ghost 17 ($140)
The Ghost 17 delivers smooth transitions with DNA LOFT v2 foam. Weight: 8.8 ounces (249 grams). Heel height: 30mm, forefoot: 20mm, drop: 10mm.

Best Trail Running Shoes: Hoka Speedgoat 6 ($155)
Trail running at its finest with 9.1 ounces (258 grams) and 5mm lugs for traction. 40mm heel stack height.`;

console.log('=== TESTING DATA CROSS-CONTAMINATION ===\n');
console.log('Content:');
console.log(multiModelContent);
console.log('\n');

const models = extractMultipleModels(multiModelContent);
console.log(`Found ${models.length} models:\n`);

models.forEach((model, i) => {
  console.log(`${i+1}. ${model.brand_name} ${model.model}`);
  console.log(`   Price: $${model.price}`);
  console.log(`   Weight: ${model.weight}g`);
  console.log(`   Heights: ${model.heel_height}mm heel, ${model.forefoot_height}mm forefoot`);
  console.log(`   Drop: ${model.drop}mm`);
  console.log('');
});

console.log('=== EXPECTED VS ACTUAL ===');
console.log('EXPECTED:');
console.log('Brooks Ghost 17: $140, 249g, 30mm/20mm, 10mm drop');
console.log('Hoka Speedgoat 6: $155, 258g, 40mm/Xmm, X drop');

console.log('\nACTUAL:');
models.forEach((model, i) => {
  console.log(`${model.brand_name} ${model.model}: $${model.price}, ${model.weight}g, ${model.heel_height}mm/${model.forefoot_height}mm, ${model.drop}mm drop`);
});

// Проверим отдельно каждую модель
console.log('\n=== INDIVIDUAL MODEL TESTING ===');

const brooksOnly = `Best Road Running Shoes: Brooks Ghost 17 ($140)
The Ghost 17 delivers smooth transitions with DNA LOFT v2 foam. Weight: 8.8 ounces (249 grams). Heel height: 30mm, forefoot: 20mm, drop: 10mm.`;

const hokaOnly = `Best Trail Running Shoes: Hoka Speedgoat 6 ($155)
Trail running at its finest with 9.1 ounces (258 grams) and 5mm lugs for traction. 40mm heel stack height.`;

console.log('Testing Brooks Ghost 17 alone:');
const brooksModels = extractMultipleModels(brooksOnly);
brooksModels.forEach(m => {
  console.log(`   ${m.brand_name} ${m.model}: $${m.price}, ${m.weight}g, ${m.heel_height}mm/${m.forefoot_height}mm, ${m.drop}mm drop`);
});

console.log('\nTesting Hoka Speedgoat 6 alone:');
const hokaModels = extractMultipleModels(hokaOnly);
hokaModels.forEach(m => {
  console.log(`   ${m.brand_name} ${m.model}: $${m.price}, ${m.weight}g, ${m.heel_height}mm/${m.forefoot_height}mm, ${m.drop}mm drop`);
});

// Анализ проблемы
console.log('\n=== ANALYSIS ===');
if (models.length >= 2) {
  const brooks = models.find(m => m.brand_name === 'Brooks');
  const hoka = models.find(m => m.brand_name === 'Hoka');

  if (brooks && hoka) {
    // Проверка на смешивание данных
    let contamination = false;

    // Brooks должен иметь 30mm heel, а Hoka - 40mm
    if (brooks.heel_height !== 30) {
      console.log(`❌ Brooks heel_height wrong: expected 30mm, got ${brooks.heel_height}mm`);
      contamination = true;
    }
    if (hoka.heel_height !== 40) {
      console.log(`❌ Hoka heel_height wrong: expected 40mm, got ${hoka.heel_height}mm`);
      contamination = true;
    }

    // Brooks должен иметь 20mm forefoot
    if (brooks.forefoot_height !== 20) {
      console.log(`❌ Brooks forefoot_height wrong: expected 20mm, got ${brooks.forefoot_height}mm`);
      contamination = true;
    }

    // Проверка цен
    if (brooks.price !== 140) {
      console.log(`❌ Brooks price wrong: expected $140, got $${brooks.price}`);
      contamination = true;
    }
    if (hoka.price !== 155) {
      console.log(`❌ Hoka price wrong: expected $155, got $${hoka.price}`);
      contamination = true;
    }

    // Проверка весов
    if (brooks.weight !== 249) {
      console.log(`❌ Brooks weight wrong: expected 249g, got ${brooks.weight}g`);
      contamination = true;
    }
    if (hoka.weight !== 258) {
      console.log(`❌ Hoka weight wrong: expected 258g, got ${hoka.weight}g`);
      contamination = true;
    }

    if (!contamination) {
      console.log('✅ No data cross-contamination detected');
    } else {
      console.log('❌ DATA CROSS-CONTAMINATION DETECTED!');
      console.log('   This indicates the algorithm is mixing specs between models.');
    }
  }
} else {
  console.log('⚠️ Not enough models found to test cross-contamination');
}

export { multiModelContent };