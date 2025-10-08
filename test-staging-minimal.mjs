// Minimal test of staging pipeline
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('🔍 Testing Staging Pipeline Logic\n');

// 1. Get Airtable records
console.log('1️⃣ Fetching from Airtable...');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const airtableRecords = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({ maxRecords: 10 })
  .firstPage();

console.log(`Found ${airtableRecords.length} records in Airtable`);

// 2. Get existing IDs from staging_table
console.log('\n2️⃣ Checking staging_table...');
const { data: existingInStaging, error: stagingError } = await supabase
  .from('staging_table')
  .select('airtable_id');

if (stagingError) {
  console.error('Error:', stagingError);
} else {
  console.log(`Found ${existingInStaging?.length || 0} records in staging_table`);
}

// 3. Get existing IDs from shoe_results
console.log('\n3️⃣ Checking shoe_results...');
const { data: existingInProduction, error: prodError } = await supabase
  .from('shoe_results')
  .select('record_id');

if (prodError) {
  console.error('Error:', prodError);
} else {
  console.log(`Found ${existingInProduction?.length || 0} records in shoe_results`);
}

// 4. Build set of existing IDs
const existingIds = new Set([
  ...(existingInStaging?.map(r => r.airtable_id) || []),
  ...(existingInProduction?.map(r => r.record_id) || [])
]);

console.log(`\n4️⃣ Total unique processed IDs: ${existingIds.size}`);

// 5. Filter new articles
const newArticles = airtableRecords.filter(record => !existingIds.has(record.id));

console.log(`\n5️⃣ Filtering results:`);
console.log(`  Total from Airtable: ${airtableRecords.length}`);
console.log(`  Already processed: ${airtableRecords.length - newArticles.length}`);
console.log(`  NEW to process: ${newArticles.length}`);

if (newArticles.length > 0) {
  console.log('\n📝 New articles to process:');
  newArticles.forEach((record, idx) => {
    console.log(`  ${idx + 1}. ${record.id} - ${record.fields.Title?.slice(0, 60)}...`);
  });
} else {
  console.log('\n⚠️  No new articles to process!');
  console.log('\n💡 Reasons why no data is added:');
  console.log('  - All Airtable records are already in staging_table OR shoe_results');
  console.log('  - This is the expected behavior - pipeline only processes NEW articles');
  console.log('\n📊 To add more data:');
  console.log('  1. Add new articles to Airtable');
  console.log('  2. Or clear staging_table: DELETE FROM staging_table;');
  console.log('  3. Or manually trigger with specific record IDs');
}
