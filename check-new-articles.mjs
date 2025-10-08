// Check which articles are new vs already processed
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

console.log('🔍 Checking New vs Processed Articles\n');

// Get all articles from Airtable
console.log('1️⃣ Fetching from Airtable...');
const airtableRecords = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({ maxRecords: 50 })
  .firstPage();

console.log(`✅ Found ${airtableRecords.length} articles in Airtable\n`);

// Get existing IDs from both tables
const { data: stagingData } = await supabase
  .from('staging_table')
  .select('airtable_id');

const { data: prodData } = await supabase
  .from('shoe_results')
  .select('record_id');

const existingIds = new Set([
  ...(stagingData?.map(r => r.airtable_id) || []),
  ...(prodData?.map(r => r.record_id) || [])
]);

console.log(`2️⃣ Already processed: ${existingIds.size} articles`);
console.log(`   - In staging: ${stagingData?.length || 0}`);
console.log(`   - In production: ${new Set(prodData?.map(r => r.record_id) || []).size}\n`);

// Filter new articles
const newArticles = airtableRecords.filter(record => !existingIds.has(record.id));

console.log(`3️⃣ NEW articles (not processed): ${newArticles.length}\n`);

if (newArticles.length > 0) {
  console.log('📄 New articles to process:');
  newArticles.forEach((record, idx) => {
    console.log(`   ${idx + 1}. ${record.fields.Title?.slice(0, 70)}...`);
    console.log(`      ID: ${record.id}, Article ID: ${record.fields.ID}`);
  });
} else {
  console.log('⚠️  NO NEW ARTICLES found!');
  console.log('\n💡 Solutions:');
  console.log('   1. Add new articles to Airtable');
  console.log('   2. Clear shoe_results table (removes production data)');
  console.log('   3. Test with specific article by removing it from shoe_results');
}

console.log('\n4️⃣ Already processed articles:');
const processedArticles = airtableRecords.filter(record => existingIds.has(record.id));
processedArticles.slice(0, 5).forEach((record, idx) => {
  console.log(`   ${idx + 1}. ${record.fields.Title?.slice(0, 70)}...`);
});
if (processedArticles.length > 5) {
  console.log(`   ... and ${processedArticles.length - 5} more`);
}
