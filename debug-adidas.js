import 'dotenv/config';
import { SimpleSyncProcessor } from './src/simple-sync.ts';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function debugAdidasRecords() {
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
    batchSize: 5,
  };

  const processor = new SimpleSyncProcessor(config);
  const parser = new SimpleSneakerParser(process.env.OPENAI_API_KEY);

  console.log('🔍 Fetching Airtable records to debug...');

  // Fetch records and find ones that produce Adidas results
  const records = await processor.fetchAirtableRecords(50);

  console.log(`📊 Found ${records.length} records to analyze`);

  let adidasProducingRecords = [];
  let processedCount = 0;

  for (const record of records) {
    processedCount++;
    console.log(`\n🔍 Processing ${processedCount}/${records.length}: ${record.fields.Title?.slice(0, 50)}...`);

    const article = processor.mapAirtableRecord(record);
    if (!article) continue;

    try {
      const result = await parser.parseArticle(article);
      const adidasSneakers = result.sneakers.filter(s =>
        s.brand.toLowerCase().includes('adidas')
      );

      if (adidasSneakers.length > 0) {
        adidasProducingRecords.push({
          record_id: record.id,
          title: article.title,
          adidasModels: adidasSneakers,
          totalExtracted: result.sneakers.length
        });

        console.log(`🎯 FOUND ADIDAS! Title: "${article.title}"`);
        console.log(`   Adidas models: ${adidasSneakers.map(s => s.model).join(', ')}`);
        console.log(`   Total extracted: ${result.sneakers.length}`);

        // Show title analysis
        const titleAnalysis = parser.analyzeTitle(article.title);
        console.log(`   Title Analysis: ${titleAnalysis.scenario} (confidence: ${titleAnalysis.confidence})`);
        if (titleAnalysis.brand) console.log(`   Expected brand: ${titleAnalysis.brand}`);
        if (titleAnalysis.model) console.log(`   Expected model: ${titleAnalysis.model}`);
      }

      // Stop after finding 10 Adidas-producing records
      if (adidasProducingRecords.length >= 10) break;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n📊 Summary: Found ${adidasProducingRecords.length} records that extract Adidas models`);

  // Analyze the problems
  console.log('\n🚨 PROBLEM ANALYSIS:');
  for (let i = 0; i < adidasProducingRecords.length; i++) {
    const rec = adidasProducingRecords[i];
    console.log(`\n${i+1}. Title: "${rec.title}"`);
    console.log(`   Adidas models extracted: ${rec.adidasModels.map(s => s.model).join(', ')}`);
    console.log(`   RELEVANT? ${rec.title.toLowerCase().includes('adidas') ? '✅ YES' : '❌ NO - IRRELEVANT!'}`);
  }
}


debugAdidasRecords().catch(console.error);