import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function testSpecificCase() {
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  // Test Case 1: Specific Adidas model in title (Scenario A)
  const testCase1 = {
    article_id: 999,
    record_id: 'test1',
    title: 'Adidas Prime X3 Strung Review: A Return to its Prime?',
    content: `The Adidas Prime X3 Strung is a revolutionary running shoe. Weighing 285 grams with a 39mm heel height and 27mm forefoot height, giving it a 12mm drop. Priced at $240, this carbon-plated shoe features premium materials.

    In comparison, the Nike Vaporfly is lighter at 275g, and the Hoka Rocket X Trail offers different terrain capabilities. The Brooks Ghost 17 provides more stability.

    The Prime X3 Strung's carbon plate provides exceptional energy return, with moderate cushioning and standard width fitting.`,
    date: '2024-01-01',
    source_link: 'https://test.com/adidas-prime-x3'
  };

  // Test Case 2: General article mentioning Adidas (Scenario B)
  const testCase2 = {
    article_id: 998,
    record_id: 'test2',
    title: 'Best Running Shoes for Beginners (2025)',
    content: `For beginners, we recommend several great options:

    The Adidas Evo SL weighs 248 grams with excellent breathability and costs $90. It has a 28mm heel and 20mm forefoot (8mm drop).

    Nike Pegasus 41 offers 275g weight, $130 price, balanced cushioning.

    Brooks Ghost 17 provides stable support at 283g, $140, with high breathability.`,
    date: '2024-01-01',
    source_link: 'https://test.com/beginner-shoes'
  };

  // Test Case 3: Non-Adidas article (should not extract Adidas)
  const testCase3 = {
    article_id: 997,
    record_id: 'test3',
    title: 'Nike Air Max Review: Ultimate Comfort',
    content: `The Nike Air Max delivers outstanding performance. Weighing 320g with 32mm heel, 24mm forefoot (8mm drop), priced at $150.

    While not as light as the Adidas Ultraboost or Brooks Ghost, the Air Max provides superior comfort with its air cushioning system.`,
    date: '2024-01-01',
    source_link: 'https://test.com/nike-air-max'
  };

  console.log('🧪 Testing Scenario A: Specific Adidas model in title');
  const result1 = await parser.parseArticle(testCase1);
  console.log('Result 1:', JSON.stringify(result1.sneakers, null, 2));

  console.log('\n🧪 Testing Scenario B: General article with Adidas mention');
  const result2 = await parser.parseArticle(testCase2);
  console.log('Result 2:', JSON.stringify(result2.sneakers, null, 2));

  console.log('\n🧪 Testing Scenario: Nike article (should NOT extract Adidas)');
  const result3 = await parser.parseArticle(testCase3);
  console.log('Result 3:', JSON.stringify(result3.sneakers, null, 2));

  // Analysis
  console.log('\n📊 Analysis:');
  console.log(`Scenario A extracted ${result1.sneakers.length} sneakers`);
  console.log(`Scenario B extracted ${result2.sneakers.length} sneakers`);
  console.log(`Nike article extracted ${result3.sneakers.length} sneakers`);

  const adidasInNikeArticle = result3.sneakers.filter(s => s.brand.toLowerCase().includes('adidas'));
  console.log(`❌ Adidas models incorrectly extracted from Nike article: ${adidasInNikeArticle.length}`);
}

testSpecificCase().catch(console.error);