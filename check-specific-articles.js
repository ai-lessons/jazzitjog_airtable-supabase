import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function checkSpecificArticles() {
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

  // The problematic article IDs we found
  const problemArticleIds = [43, 55, 122, 142, 134, 115, 117, 168, 221, 225];

  console.log('🔍 Checking specific articles that produced Adidas records...\n');

  // Fetch ALL Airtable records
  const airtableRecords = await processor.fetchAirtableRecords();
  console.log(`📊 Fetched ${airtableRecords.length} Airtable records\n`);

  for (const articleId of problemArticleIds.slice(0, 5)) { // Check first 5 to avoid timeout
    console.log(`🔍 Looking for Article ID: ${articleId}`);

    const matchingRecord = airtableRecords.find(record => {
      const mapped = processor.mapAirtableRecord(record);
      if (!mapped) return false;
      return mapped.article_id === articleId;
    });

    if (matchingRecord) {
      const mapped = processor.mapAirtableRecord(matchingRecord);
      const title = mapped.title;
      const isAdidasRelevant = title.toLowerCase().includes('adidas');

      console.log(`✅ FOUND: Article ${articleId}`);
      console.log(`   Title: "${title}"`);
      console.log(`   Contains "adidas"? ${isAdidasRelevant ? '✅ YES - RELEVANT' : '❌ NO - IRRELEVANT!'}`);

      if (!isAdidasRelevant) {
        console.log(`   🚨 PROBLEM: This article should NOT have produced Adidas records!`);
      }

    } else {
      console.log(`❌ NOT FOUND: Article ${articleId} not in Airtable records`);
    }
    console.log('');
  }

  // Also check some recent records to see what titles we're actually processing
  console.log('📋 Sample of recent article titles being processed:');
  const recentRecords = airtableRecords.slice(0, 10);
  recentRecords.forEach((record, i) => {
    const mapped = processor.mapAirtableRecord(record);
    if (mapped) {
      console.log(`${i+1}. Article ${mapped.article_id}: "${mapped.title}"`);
    }
  });

}

checkSpecificArticles().catch(console.error);