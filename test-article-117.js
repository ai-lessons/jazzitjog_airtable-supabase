import 'dotenv/config';
import { SimpleSneakerParser } from './src/simple-parser.ts';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function testArticle117() {
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

  console.log('🧪 Testing Article 117 (general scenario)...\n');

  // Find Article 117 "Best Running Shoes for Beginners (2025)"
  const airtableRecords = await processor.fetchAirtableRecords();

  const problemRecord = airtableRecords.find(record => {
    const mapped = processor.mapAirtableRecord(record);
    return mapped && mapped.article_id === 117;
  });

  if (!problemRecord) {
    console.log('❌ Could not find Article 117');
    return;
  }

  const mapped = processor.mapAirtableRecord(problemRecord);
  console.log(`📄 TESTING ARTICLE 117:`);
  console.log(`Title: "${mapped.title}"`);
  console.log(`Content length: ${mapped.content.length} chars`);

  // Step 1: Analyze title
  const titleAnalysis = parser.analyzeTitle(mapped.title);
  console.log(`\n🎯 TITLE ANALYSIS:`);
  console.log(`  Scenario: ${titleAnalysis.scenario}`);
  console.log(`  Brand: ${titleAnalysis.brand || 'none'}`);
  console.log(`  Model: ${titleAnalysis.model || 'none'}`);
  console.log(`  Confidence: ${titleAnalysis.confidence}`);

  // Step 2: Count Adidas mentions manually
  const adidasMentions = (mapped.content.toLowerCase().match(/adidas/g) || []).length;
  console.log(`\n🔢 Manual count - Adidas mentions in content: ${adidasMentions}`);

  if (titleAnalysis.scenario === 'general' && adidasMentions < 2) {
    console.log(`📋 Expected result: Adidas should be FILTERED OUT (general article with <2 mentions)`);
  } else {
    console.log(`📋 Expected result: Adidas might be allowed`);
  }

  // Step 3: Extract sneakers
  console.log(`\n🤖 EXTRACTING SNEAKERS...`);

  try {
    const result = await parser.parseArticle(mapped);

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`Total sneakers after filtering: ${result.sneakers.length}`);

    const adidasSneakers = result.sneakers.filter(s => s.brand.toLowerCase().includes('adidas'));

    console.log(`\n👟 All extracted sneakers:`);
    result.sneakers.forEach((sneaker, i) => {
      const isAdidas = sneaker.brand.toLowerCase().includes('adidas');
      console.log(`${i+1}. ${sneaker.brand} ${sneaker.model} ${isAdidas ? '🚨 ADIDAS!' : ''}`);
    });

    console.log(`\n🎯 ANALYSIS:`);
    console.log(`Adidas sneakers found: ${adidasSneakers.length}`);

    if (adidasSneakers.length > 0) {
      console.log(`🚨 FILTERING FAILED! Found Adidas models:`);
      adidasSneakers.forEach(s => console.log(`  - ${s.brand} ${s.model}`));

      if (titleAnalysis.scenario === 'general' && adidasMentions < 2) {
        console.log(`💥 This is a BUG! General article with ${adidasMentions} Adidas mentions should filter out Adidas!`);
      }
    } else {
      console.log(`✅ FILTERING WORKED! No Adidas models found.`);
    }

  } catch (error) {
    console.log(`❌ Error during extraction: ${error.message}`);
  }
}

testArticle117().catch(console.error);