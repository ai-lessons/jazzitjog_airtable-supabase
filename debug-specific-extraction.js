import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function debugSpecificExtraction() {
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

  console.log('🔍 Finding problematic article: New Balance FuelCell Rebel v5...');

  // Find the New Balance FuelCell Rebel v5 article (Article 43)
  const airtableRecords = await processor.fetchAirtableRecords();

  const problemRecord = airtableRecords.find(record => {
    const mapped = processor.mapAirtableRecord(record);
    return mapped && mapped.article_id === 43;
  });

  if (!problemRecord) {
    console.log('❌ Could not find the problematic article');
    return;
  }

  const mapped = processor.mapAirtableRecord(problemRecord);
  console.log(`\n📄 PROBLEMATIC ARTICLE:`);
  console.log(`Title: "${mapped.title}"`);
  console.log(`Article ID: ${mapped.article_id}`);
  console.log(`Content length: ${mapped.content.length} characters`);

  // Show first part of content to see what's causing the issue
  console.log(`\n📋 Content preview (first 500 chars):`);
  console.log(`"${mapped.content.slice(0, 500)}..."`);

  // Analyze title
  const titleAnalysis = parser.analyzeTitle(mapped.title);
  console.log(`\n🎯 TITLE ANALYSIS:`);
  console.log(`  Scenario: ${titleAnalysis.scenario}`);
  console.log(`  Brand: ${titleAnalysis.brand || 'none detected'}`);
  console.log(`  Model: ${titleAnalysis.model || 'none detected'}`);
  console.log(`  Confidence: ${titleAnalysis.confidence}`);

  // Now try to extract sneakers
  console.log(`\n🤖 RUNNING EXTRACTION...`);

  try {
    const result = await parser.parseArticle(mapped);

    console.log(`\n📊 EXTRACTION RESULTS:`);
    console.log(`Total sneakers extracted: ${result.sneakers.length}`);

    result.sneakers.forEach((sneaker, i) => {
      console.log(`\n${i+1}. ${sneaker.brand} ${sneaker.model}`);
      console.log(`   Should be filtered: ${sneaker.brand.toLowerCase().includes('adidas') ? 'YES - THIS IS THE PROBLEM!' : 'No'}`);
    });

    // Check for Adidas specifically
    const adidasSneakers = result.sneakers.filter(s => s.brand.toLowerCase().includes('adidas'));

    if (adidasSneakers.length > 0) {
      console.log(`\n🚨 CONFIRMED PROBLEM: Found ${adidasSneakers.length} Adidas sneakers from New Balance article!`);
      adidasSneakers.forEach(sneaker => {
        console.log(`   - ${sneaker.brand} ${sneaker.model}`);
      });

      console.log(`\n🔍 DEBUGGING WHY FILTERING FAILED:`);
      console.log(`Expected: Title scenario is 'specific' with brand 'New Balance', model 'FuelCell Rebel v5'`);
      console.log(`Expected: Adidas models should be filtered out by isRelevantSneaker()`);
      console.log(`Actual: Adidas models passed through filtering`);

    } else {
      console.log(`\n✅ No Adidas sneakers found (filtering worked)`);
    }

  } catch (error) {
    console.log(`\n❌ Extraction failed: ${error.message}`);
  }
}

debugSpecificExtraction().catch(console.error);