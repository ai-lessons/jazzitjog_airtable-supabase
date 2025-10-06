import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function debugAdidasArticles() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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

  console.log('🔍 Checking which articles produced Adidas records...\n');

  // Get all Adidas records
  const { data: adidasRecords, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model')
    .or('brand_name.ilike.%adidas%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${adidasRecords.length} Adidas records in database:`);
  adidasRecords.forEach((record, i) => {
    console.log(`${i+1}. Article ${record.article_id}: ${record.brand_name} ${record.model}`);
  });

  // Get unique article IDs
  const articleIds = [...new Set(adidasRecords.map(r => r.article_id))];

  console.log(`\n📊 These came from ${articleIds.length} unique articles. Checking each:\n`);

  // Fetch Airtable records to find the titles
  const airtableRecords = await processor.fetchAirtableRecords(200);

  let relevantCount = 0;
  let irrelevantCount = 0;

  for (const articleId of articleIds) {
    const airtableRecord = airtableRecords.find(r => {
      const mapped = processor.mapAirtableRecord(r);
      return mapped && mapped.article_id === articleId;
    });

    if (airtableRecord) {
      const mapped = processor.mapAirtableRecord(airtableRecord);
      const title = mapped.title;
      const adidasFromThisArticle = adidasRecords.filter(r => r.article_id === articleId);

      const isRelevant = title.toLowerCase().includes('adidas');
      const status = isRelevant ? '✅ RELEVANT' : '❌ IRRELEVANT';

      if (isRelevant) relevantCount++;
      else irrelevantCount++;

      console.log(`Article ${articleId}: "${title}"`);
      console.log(`  Status: ${status}`);
      console.log(`  Extracted: ${adidasFromThisArticle.map(r => `${r.brand_name} ${r.model}`).join(', ')}`);
      console.log('');
    }
  }

  console.log('🎯 FINAL ANALYSIS:');
  console.log(`✅ Relevant articles (contain "adidas" in title): ${relevantCount}`);
  console.log(`❌ Irrelevant articles (DON'T contain "adidas" in title): ${irrelevantCount}`);

  if (irrelevantCount > 0) {
    console.log('\n🚨 PROBLEM CONFIRMED: System is still extracting Adidas from non-Adidas articles!');
    console.log('The filtering is NOT working correctly.');
  } else {
    console.log('\n🎉 SUCCESS: All Adidas extractions are from relevant articles!');
    console.log('The filtering is working correctly.');
  }
}

debugAdidasArticles().catch(console.error);