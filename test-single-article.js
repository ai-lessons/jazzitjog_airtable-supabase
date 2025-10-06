import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function testSingleArticle() {
  const config = {
    airtable: {
      apiKey: process.env.AIRTABLE_API_KEY,
      baseId: process.env.AIRTABLE_BASE_ID,
      tableName: process.env.AIRTABLE_TABLE_NAME,
    },
    supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  };

  const processor = new SimpleSyncProcessor(config);
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  console.log('🧪 Testing filtering on specific problematic article...\n');

  // Find Article 43 "New Balance FuelCell Rebel v5 Review"
  const airtableRecords = await processor.fetchAirtableRecords();

  const problemRecord = airtableRecords.find(record => {
    const mapped = processor.mapAirtableRecord(record);
    return mapped && mapped.article_id === 43;
  });

  if (!problemRecord) {
    console.log('❌ Could not find Article 43');
    return;
  }

  const mapped = processor.mapAirtableRecord(problemRecord);
  console.log(`📄 TESTING ARTICLE 43:`);
  console.log(`Title: "${mapped.title}"`);

  // Step 1: Analyze title
  const titleAnalysis = parser.analyzeTitle(mapped.title);
  console.log(`\n🎯 TITLE ANALYSIS:`);
  console.log(`  Scenario: ${titleAnalysis.scenario}`);
  console.log(`  Brand: ${titleAnalysis.brand || 'none'}`);
  console.log(`  Model: ${titleAnalysis.model || 'none'}`);
  console.log(`  Confidence: ${titleAnalysis.confidence}`);

  // Step 2: Extract sneakers
  console.log(`\n🤖 EXTRACTING SNEAKERS (with detailed filtering logs)...`);

  try {
    const result = await parser.parseArticle(mapped);

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`Total sneakers after filtering: ${result.sneakers.length}`);

    result.sneakers.forEach((sneaker, i) => {
      console.log(`${i+1}. ${sneaker.brand} ${sneaker.model}`);

      // THIS IS THE PROBLEM - check if this is Adidas
      if (sneaker.brand.toLowerCase().includes('adidas')) {
        console.log(`   🚨 ADIDAS FOUND! This should have been filtered out!`);

        // Let's manually test the filtering logic
        console.log(`   📋 Manual filter test:`);
        console.log(`     titleAnalysis.scenario: ${titleAnalysis.scenario}`);
        console.log(`     titleAnalysis.brand: ${titleAnalysis.brand}`);
        console.log(`     sneaker.brand: ${sneaker.brand}`);
        console.log(`     Expected: Should be filtered because ${sneaker.brand} ≠ ${titleAnalysis.brand}`);
      }
    });

    if (result.sneakers.some(s => s.brand.toLowerCase().includes('adidas'))) {
      console.log(`\n🚨 FILTERING FAILED! Adidas models were not filtered out!`);
    } else {
      console.log(`\n✅ FILTERING WORKED! No Adidas models found.`);
    }

  } catch (error) {
    console.log(`❌ Error during extraction: ${error.message}`);
  }
}

testSingleArticle().catch(console.error);