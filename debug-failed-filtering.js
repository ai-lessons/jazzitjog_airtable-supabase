import 'dotenv/config';
import { SimpleSyncProcessor } from './src/simple-sync.ts';
import { SimpleSneakerParser } from './src/simple-parser.ts';

async function debugFailedFiltering() {
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

  // The problematic articles that created Adidas records despite filtering
  const problemArticleIds = [43, 55, 115, 117, 122, 134, 142, 168, 221, 225];

  console.log('🔍 Debugging articles that bypassed Adidas filtering...\n');

  // Fetch ALL Airtable records
  const airtableRecords = await processor.fetchAirtableRecords();
  console.log(`📊 Fetched ${airtableRecords.length} Airtable records\n`);

  for (const articleId of problemArticleIds.slice(0, 5)) { // Check first 5 to avoid timeout
    console.log(`🔍 === DEBUGGING ARTICLE ${articleId} ===`);

    const matchingRecord = airtableRecords.find(record => {
      const mapped = processor.mapAirtableRecord(record);
      if (!mapped) return false;
      return mapped.article_id === articleId;
    });

    if (matchingRecord) {
      const mapped = processor.mapAirtableRecord(matchingRecord);
      const title = mapped.title;

      console.log(`📄 Title: "${title}"`);
      console.log(`📝 Content length: ${mapped.content.length} characters`);
      console.log(`🔍 Contains "adidas" in title: ${title.toLowerCase().includes('adidas') ? 'YES' : 'NO'}`);

      // Analyze the title
      const titleAnalysis = parser.analyzeTitle(title);
      console.log(`\n🎯 TITLE ANALYSIS:`);
      console.log(`   Scenario: ${titleAnalysis.scenario}`);
      console.log(`   Brand: ${titleAnalysis.brand || 'none'}`);
      console.log(`   Model: ${titleAnalysis.model || 'none'}`);
      console.log(`   Confidence: ${titleAnalysis.confidence}`);

      // Check if this should have been filtered
      const shouldHaveFiltered = !title.toLowerCase().includes('adidas');
      if (shouldHaveFiltered) {
        console.log(`\n🚨 THIS ARTICLE SHOULD HAVE BEEN FILTERED!`);
        console.log(`   Title does not contain "adidas" but Adidas models were extracted.`);

        if (titleAnalysis.scenario === 'specific') {
          console.log(`   Expected: Only ${titleAnalysis.brand} ${titleAnalysis.model} should be extracted`);
          console.log(`   Problem: Adidas models were incorrectly extracted`);
        } else if (titleAnalysis.scenario === 'general') {
          console.log(`   Expected: General article - should filter out brands with <2 mentions`);
          console.log(`   Problem: Adidas models passed the mention threshold`);
        } else if (titleAnalysis.scenario === 'brand') {
          console.log(`   Expected: Only ${titleAnalysis.brand} models should be extracted`);
          console.log(`   Problem: Adidas models were incorrectly extracted`);
        }
      } else {
        console.log(`\n✅ This article correctly contains "adidas" in title`);
      }

      // Show a sample of content to see what might be causing the issue
      const contentSample = mapped.content.slice(0, 1000);
      const adidasMentions = (contentSample.toLowerCase().match(/adidas/g) || []).length;
      console.log(`\n📋 Content sample (first 1000 chars):`);
      console.log(`"${contentSample}..."`);
      console.log(`🔢 Adidas mentions in sample: ${adidasMentions}`);

    } else {
      console.log(`❌ NOT FOUND: Article ${articleId} not in Airtable records`);
    }
    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🎯 SUMMARY:');
  console.log('If any articles above show "SHOULD HAVE BEEN FILTERED" but still');
  console.log('created Adidas records, then our filtering logic has a bug.');
}

debugFailedFiltering().catch(console.error);