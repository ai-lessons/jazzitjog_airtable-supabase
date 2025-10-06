import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function checkSpecificProblems() {
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  // Simulate the exact problems you mentioned:
  const problemCases = [
    {
      title: "Asics Megablast Performance Review",
      content: `The Asics Megablast is a performance shoe. In comparisons with other shoes like the Adidas Ultraboost, Nike Air Zoom, and Brooks Ghost, the Megablast stands out.`,
      expected: "Should extract ONLY Asics Megablast, NOT Adidas"
    },
    {
      title: "Mizuno Wave Rebellion Flash 3 Performance Review",
      content: `The Mizuno Wave Rebellion Flash 3 delivers speed. Compared to racing shoes like Adidas Takumi Sen and Nike Vaporfly, this Mizuno offers unique features.`,
      expected: "Should extract ONLY Mizuno, NOT Adidas"
    },
    {
      title: "New Balance FuelCell Rebel v5 review",
      content: `The New Balance FuelCell Rebel v5 is excellent. Other daily trainers like Adidas Boston 12 and Nike Pegasus don't quite match its energy return.`,
      expected: "Should extract ONLY New Balance, NOT Adidas"
    },
    {
      title: "Best Running Shoes for Beginners (2025)",
      content: `For beginners, we recommend: Adidas Evo SL is lightweight and affordable. The Nike Pegasus 41 offers stability. Brooks Ghost 17 provides comfort.`,
      expected: "Should extract Adidas Evo SL (full name), Nike Pegasus 41, Brooks Ghost 17"
    }
  ];

  console.log('🚨 TESTING ACTUAL PROBLEM CASES:\n');

  for (let i = 0; i < problemCases.length; i++) {
    const testCase = problemCases[i];

    console.log(`\n${i+1}. TITLE: "${testCase.title}"`);
    console.log(`   EXPECTED: ${testCase.expected}`);

    try {
      const titleAnalysis = parser.analyzeTitle(testCase.title);
      console.log(`   Title Analysis: ${titleAnalysis.scenario}, brand: ${titleAnalysis.brand}, model: ${titleAnalysis.model}, confidence: ${titleAnalysis.confidence}`);

      const result = await parser.parseArticle({
        article_id: 1000 + i,
        record_id: `test${i}`,
        title: testCase.title,
        content: testCase.content,
        date: '2024-01-01',
        source_link: 'https://test.com'
      });

      console.log(`   ACTUAL RESULT: ${result.sneakers.length} sneakers extracted`);
      result.sneakers.forEach(sneaker => {
        console.log(`     - ${sneaker.brand} ${sneaker.model}`);
      });

      // Check for incorrect Adidas extraction
      const incorrectAdidas = result.sneakers.filter(s =>
        s.brand.toLowerCase().includes('adidas') &&
        !testCase.title.toLowerCase().includes('adidas')
      );

      if (incorrectAdidas.length > 0) {
        console.log(`   ❌ PROBLEM: Extracted ${incorrectAdidas.length} Adidas models from non-Adidas article!`);
      } else if (testCase.title.toLowerCase().includes('adidas') && !result.sneakers.some(s => s.brand.toLowerCase().includes('adidas'))) {
        console.log(`   ❌ PROBLEM: Missing Adidas from Adidas article!`);
      } else {
        console.log(`   ✅ CORRECT: Proper brand filtering`);
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

checkSpecificProblems().catch(console.error);