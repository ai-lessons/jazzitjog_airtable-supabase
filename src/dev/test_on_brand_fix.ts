import { SimpleSneakerParser } from '../simple-parser';
import dotenv from 'dotenv';

dotenv.config();

// Test cases that previously caused false positives with "On" brand
const testCases = [
  {
    title: "Test Article 1",
    content: "I've been testing ultras since 2015 and these are great shoes for longer 2 hour runs. The heel stack is 32mm."
  },
  {
    title: "Test Article 2",
    content: "This article reviews an 18 dollar product, a 500 dollar jacket, and a 100 dollar pair of glasses."
  },
  {
    title: "Test Article 3",
    content: "The 001 model from Norda is excellent. A recent 17 year old runner tested it."
  },
  {
    title: "On CloudUltra Review",
    content: "The On CloudUltra et 2 is a trail running shoe with 30mm heel height and 24mm forefoot height, giving it a 6mm drop. It weighs 280g."
  },
  {
    title: "Best Trail Shoes",
    content: "Trails in 2017 were different. Trails from 50k to 100k require good shoes like the Hoka Challenger 8 with 32mm heel and 24mm forefoot."
  },
  {
    title: "On Cloudsurfer Trail 2 Review",
    content: "The On Cloudsurfer Trail 2 features a v8 midsole compound. It has a 29mm heel and 23mm forefoot, for a 6mm drop. Weight is 270g."
  },
  {
    title: "Summer Gear",
    content: "These sandals have a 2mm drop and cost $45. Not running shoes though."
  },
  {
    title: "On Cloudmonster Review",
    content: "The On Cloudmonster is a maximal cushioned road shoe with 37mm heel stack, 31mm forefoot, and weighs 292g. Price is $170."
  }
];

async function testOnBrandExtraction() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }
  const parser = new SimpleSneakerParser(apiKey);

  console.log('Testing On brand extraction fixes...\n');
  console.log('='.repeat(80));

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\nTest Case ${i + 1}: ${testCase.title}`);
    console.log('-'.repeat(80));
    console.log(`Content: ${testCase.content.substring(0, 100)}...`);

    try {
      const result = await parser.parseArticle({
        article_id: i + 1,
        airtable_id: `test_${i + 1}`,
        title: testCase.title,
        content: testCase.content
      });

      console.log(`\n✓ Extracted ${result.sneakers.length} sneakers:`);

      if (result.sneakers.length === 0) {
        console.log('  (No sneakers extracted - this is correct for non-running-shoe content)');
      } else {
        result.sneakers.forEach((sneaker, idx) => {
          console.log(`  ${idx + 1}. ${sneaker.brand} ${sneaker.model}`);
          console.log(`     - Heel: ${sneaker.heel || 'N/A'}mm, Drop: ${sneaker.drop || 'N/A'}mm`);
          console.log(`     - Weight: ${sneaker.weight || 'N/A'}g, Price: $${sneaker.price || 'N/A'}`);
          console.log(`     - Surface: ${sneaker.surface || 'N/A'}, Use: ${sneaker.use || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log(`\n✗ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Test completed!');
}

testOnBrandExtraction().catch(console.error);
