import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function clearAndTest() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🗑️  Clearing all existing records...');

  // Clear all shoe_results
  const { data: allRecords } = await supabase
    .from('shoe_results')
    .select('id');

  if (allRecords && allRecords.length > 0) {
    console.log(`Found ${allRecords.length} records to delete`);

    const { error: deleteError } = await supabase
      .from('shoe_results')
      .delete()
      .in('id', allRecords.map(r => r.id));

    if (deleteError) {
      console.error('Error clearing database:', deleteError);
      return;
    }
  } else {
    console.log('No records found to delete');
  }

  console.log('✅ Database cleared');

  // Now test fresh processing with improved system
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

  console.log('🚀 Testing with fresh processing (10 records)...');

  const result = await processor.syncFromAirtable(10);

  console.log('📊 Fresh processing results:');
  console.log(`✅ Successful: ${result.successful}`);
  console.log(`❌ Failed: ${result.failed}`);
  console.log(`👟 Sneakers extracted: ${result.sneakers_extracted}`);

  // Check what Adidas records we now have
  console.log('\n🔍 Checking Adidas records in fresh database...');
  const { data: adidasRecords, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model, source_link')
    .ilike('brand_name', '%adidas%');

  if (error) {
    console.error('Error querying Adidas records:', error);
    return;
  }

  console.log(`\n📊 Found ${adidasRecords.length} Adidas records:`);
  adidasRecords.forEach((record, i) => {
    console.log(`${i+1}. Article ${record.article_id}: ${record.brand_name} ${record.model}`);
    console.log(`   Source: ${record.source_link || 'N/A'}`);
  });

  // Get the articles that produced these Adidas records
  if (adidasRecords.length > 0) {
    console.log('\n🔍 Analyzing which articles produced Adidas records...');

    const articleIds = [...new Set(adidasRecords.map(r => r.article_id))];

    for (const articleId of articleIds) {
      const airtableRecords = await processor.fetchAirtableRecords(50);
      const record = airtableRecords.find(r => {
        const mapped = processor.mapAirtableRecord(r);
        return mapped && mapped.article_id === articleId;
      });

      if (record) {
        const mapped = processor.mapAirtableRecord(record);
        const adidasFromThisArticle = adidasRecords.filter(r => r.article_id === articleId);

        console.log(`\nArticle ${articleId}: "${mapped.title}"`);
        console.log(`  Adidas models extracted: ${adidasFromThisArticle.map(r => r.model).join(', ')}`);
        console.log(`  RELEVANT? ${mapped.title.toLowerCase().includes('adidas') ? '✅ YES' : '❌ NO - PROBLEM!'}`);
      }
    }
  }

  console.log('\n✅ Fresh processing test complete');
}

clearAndTest().catch(console.error);