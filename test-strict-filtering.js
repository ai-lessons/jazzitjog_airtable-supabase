import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function testStrictFiltering() {
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  // Test the exact problematic cases
  const testCases = [
    {
      name: "New Balance article (should NOT extract Adidas)",
      title: "New Balance FuelCell Rebel v5 Review",
      content: "The New Balance FuelCell Rebel v5 is fantastic. Compared to Adidas EVO and Nike Pegasus, it offers superior energy return.",
      expectedAdidas: 0
    },
    {
      name: "Adidas article (SHOULD extract Adidas)",
      title: "Adidas Prime X3 Strung Review",
      content: "The Adidas Prime X3 Strung weighs 285g with 39mm heel. This carbon-plated shoe excels. Compared to Nike Vaporfly, it's more stable.",
      expectedAdidas: 1
    },
    {
      name: "General article (should be very strict)",
      title: "Best Running Shoes for Beginners (2025)",
      content: "We tested many shoes. The Adidas EVO SL is great for beginners at $90. Nike Pegasus 41 offers stability. Brooks Ghost 17 provides comfort. Adidas EVO SL features lightweight construction with breathable mesh.",
      expectedAdidas: 1 // Should extract because Adidas is substantially discussed
    }
  ];

  console.log('🧪 TESTING STRICT FILTERING:\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    console.log(`${i+1}. ${testCase.name}`);
    console.log(`   Title: "${testCase.title}"`);

    try {
      const titleAnalysis = parser.analyzeTitle(testCase.title);
      console.log(`   Title Analysis: ${titleAnalysis.scenario}, brand: ${titleAnalysis.brand}, confidence: ${titleAnalysis.confidence}`);

      const result = await parser.parseArticle({
        article_id: 1000 + i,
        record_id: `test${i}`,
        title: testCase.title,
        content: testCase.content,
        date: '2024-01-01',
        source_link: 'https://test.com'
      });

      const adidasSneakers = result.sneakers.filter(s => s.brand.toLowerCase().includes('adidas'));

      console.log(`   RESULT: ${adidasSneakers.length} Adidas sneakers extracted (expected: ${testCase.expectedAdidas})`);

      if (adidasSneakers.length !== testCase.expectedAdidas) {
        console.log(`   ❌ FILTERING FAILED!`);
        if (adidasSneakers.length > testCase.expectedAdidas) {
          console.log(`      Incorrectly extracted: ${adidasSneakers.map(s => `${s.brand} ${s.model}`).join(', ')}`);
        }
      } else {
        console.log(`   ✅ FILTERING WORKED!`);
      }

      console.log(`   All extracted: ${result.sneakers.map(s => `${s.brand} ${s.model}`).join(', ')}`);

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }

    console.log('');
  }
}

testStrictFiltering().catch(console.error);