import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function testRealisticContent() {
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  // More realistic content that should cause the problems
  const realisticCase = {
    title: "Asics Megablast Performance Review",
    content: `The Asics Megablast is Asics' latest max-cushioned trainer. Weighing 285g with a 39mm heel height and 27mm forefoot height, giving it a 12mm drop. Priced at $160, this shoe features FlyteFoam Blast+ midsole.

    How does it compare to competition? The Adidas Ultraboost 22 offers similar comfort at 310g and $180. The Nike Air Zoom Pegasus 40 weighs 275g at $130. The Brooks Glycerin 21 provides plush cushioning at 290g for $150.

    The Megablast's 39/27mm stack height configuration offers excellent road cushioning. Its engineered mesh upper provides high breathability. The shoe fits true to size with standard width.

    For daily training, the Asics Megablast delivers balanced cushioning that's softer than firm trainers but not as plush as max cushioning shoes like the Hoka Bondi or New Balance More v5.

    Verdict: The Asics Megablast is a solid daily trainer that competes well with the Adidas Ultraboost, though it's heavier than racing options like the Adidas Takumi Sen or Nike Vaporfly.`,
  };

  console.log('🧪 TESTING REALISTIC PROBLEMATIC CONTENT:\n');
  console.log(`TITLE: "${realisticCase.title}"`);
  console.log(`EXPECTED: Should extract ONLY Asics Megablast, NOT Adidas/Nike/Brooks/Hoka/New Balance`);

  try {
    const titleAnalysis = parser.analyzeTitle(realisticCase.title);
    console.log(`\nTitle Analysis:`);
    console.log(`  Scenario: ${titleAnalysis.scenario}`);
    console.log(`  Brand: ${titleAnalysis.brand}`);
    console.log(`  Model: ${titleAnalysis.model}`);
    console.log(`  Confidence: ${titleAnalysis.confidence}`);

    const result = await parser.parseArticle({
      article_id: 9999,
      record_id: 'realistic_test',
      title: realisticCase.title,
      content: realisticCase.content,
      date: '2024-01-01',
      source_link: 'https://test.com'
    });

    console.log(`\n📊 EXTRACTION RESULTS:`);
    console.log(`Total sneakers extracted: ${result.sneakers.length}`);

    if (result.sneakers.length === 0) {
      console.log('❌ PROBLEM: No sneakers extracted at all!');
      return;
    }

    result.sneakers.forEach((sneaker, i) => {
      console.log(`\n${i+1}. Brand: ${sneaker.brand}, Model: ${sneaker.model}`);
      console.log(`   Specs: heel=${sneaker.heel}mm, forefoot=${sneaker.forefoot}mm, drop=${sneaker.drop}mm`);
      console.log(`   Weight: ${sneaker.weight}g, Price: $${sneaker.price}`);
      console.log(`   Features: cushioning=${sneaker.cushioning}, breathability=${sneaker.breathability}`);
    });

    // Analysis
    const asSneakers = result.sneakers.filter(s => s.brand.toLowerCase().includes('asics'));
    const adidasSneakers = result.sneakers.filter(s => s.brand.toLowerCase().includes('adidas'));
    const otherSneakers = result.sneakers.filter(s =>
      !s.brand.toLowerCase().includes('asics') &&
      !s.brand.toLowerCase().includes('adidas')
    );

    console.log(`\n🎯 ANALYSIS:`);
    console.log(`✅ Asics models extracted: ${asSneakers.length} (CORRECT)`);
    console.log(`❌ Adidas models extracted: ${adidasSneakers.length} (SHOULD BE 0)`);
    console.log(`❌ Other brands extracted: ${otherSneakers.length} (SHOULD BE 0)`);

    if (adidasSneakers.length > 0) {
      console.log(`\n🚨 IRRELEVANT ADIDAS EXTRACTIONS:`);
      adidasSneakers.forEach(s => console.log(`  - ${s.brand} ${s.model}`));
    }

    if (otherSneakers.length > 0) {
      console.log(`\n🚨 OTHER IRRELEVANT EXTRACTIONS:`);
      otherSneakers.forEach(s => console.log(`  - ${s.brand} ${s.model}`));
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

testRealisticContent().catch(console.error);