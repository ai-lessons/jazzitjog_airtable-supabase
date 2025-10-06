import 'dotenv/config';
import { SimpleSyncProcessor } from './src/simple-sync.ts';

async function finalAdidasCheck() {
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

  console.log('🔍 Final check of remaining Adidas articles...\n');

  // The Adidas articles that still have records
  const adidasArticleIds = [142, 168, 115, 55];

  // Fetch ALL Airtable records
  const airtableRecords = await processor.fetchAirtableRecords();

  for (const articleId of adidasArticleIds) {
    console.log(`🔍 Checking Article ${articleId}:`);

    const matchingRecord = airtableRecords.find(record => {
      const mapped = processor.mapAirtableRecord(record);
      if (!mapped) return false;
      return mapped.article_id === articleId;
    });

    if (matchingRecord) {
      const mapped = processor.mapAirtableRecord(matchingRecord);
      const title = mapped.title;
      const isRelevant = title.toLowerCase().includes('adidas');

      console.log(`  Title: "${title}"`);
      console.log(`  Contains "adidas"? ${isRelevant ? '✅ YES - RELEVANT' : '❌ NO - IRRELEVANT!'}`);

      if (isRelevant) {
        console.log(`  ✅ This is CORRECT - Adidas article should extract Adidas models`);
      } else {
        console.log(`  🚨 This is WRONG - Non-Adidas article extracted Adidas models!`);
      }

    } else {
      console.log(`  ❌ Article ${articleId} not found in current Airtable (might be old data)`);
    }
    console.log('');
  }
}

finalAdidasCheck().catch(console.error);