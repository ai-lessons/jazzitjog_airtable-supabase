// Debug script to understand GitHub Actions filtering issue
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

console.log('🔍 DEBUG: GitHub Actions Filtering Issue\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('   SUPABASE_KEY:', process.env.SUPABASE_KEY?.slice(0, 20) + '...');
console.log('   AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID);
console.log('   AIRTABLE_TABLE_NAME:', process.env.AIRTABLE_TABLE_NAME);

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Check staging_table
console.log('\n2️⃣ Checking staging_table...');
const { data: stagingData, error: stagingError } = await supabase
  .from('staging_table')
  .select('airtable_id');

if (stagingError) {
  console.error('   ❌ Error:', stagingError.message);
} else {
  console.log(`   ✅ Found ${stagingData?.length || 0} records`);
  if (stagingData && stagingData.length > 0) {
    console.log('   Sample airtable_ids:', stagingData.slice(0, 3).map(r => r.airtable_id));
  }
}

// Check shoe_results
console.log('\n3️⃣ Checking shoe_results...');
const { data: prodData, error: prodError } = await supabase
  .from('shoe_results')
  .select('record_id');

if (prodError) {
  console.error('   ❌ Error:', prodError.message);
} else {
  const uniqueIds = new Set(prodData?.map(r => r.record_id) || []);
  console.log(`   ✅ Total records: ${prodData?.length || 0}`);
  console.log(`   ✅ Unique record_ids: ${uniqueIds.size}`);
  if (prodData && prodData.length > 0) {
    console.log('   Sample record_ids:', [...uniqueIds].slice(0, 3));
  }
}

// Check Airtable
console.log('\n4️⃣ Checking Airtable...');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const airtableRecords = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({ maxRecords: 5 })
  .firstPage();

console.log(`   ✅ Fetched ${airtableRecords.length} records`);
if (airtableRecords.length > 0) {
  console.log('   Sample Airtable record_ids:', airtableRecords.map(r => r.id));
}

// Simulate filtering logic
console.log('\n5️⃣ Simulating Filtering Logic...');
const existingIds = new Set([
  ...(stagingData?.map(r => r.airtable_id) || []),
  ...(prodData?.map(r => r.record_id) || [])
]);

console.log(`   Total existing IDs in DB: ${existingIds.size}`);
console.log('   First 3 existing IDs:', [...existingIds].slice(0, 3));

const newArticles = airtableRecords.filter(record => !existingIds.has(record.id));

console.log(`\n6️⃣ Filter Results:`);
console.log(`   Total from Airtable: ${airtableRecords.length}`);
console.log(`   Already in DB: ${airtableRecords.length - newArticles.length}`);
console.log(`   NEW to process: ${newArticles.length}`);

if (newArticles.length > 0) {
  console.log('\n   ✅ New articles found:');
  newArticles.forEach(r => {
    console.log(`      - ${r.id}: ${r.fields.Title?.slice(0, 60)}`);
  });
} else {
  console.log('\n   ⚠️  NO new articles (all already processed)');

  // Check if Airtable IDs match DB IDs
  const airtableIds = new Set(airtableRecords.map(r => r.id));
  const matchCount = [...airtableIds].filter(id => existingIds.has(id)).length;

  console.log(`\n   📊 Match analysis:`);
  console.log(`      Airtable IDs in sample: ${airtableIds.size}`);
  console.log(`      Matching in DB: ${matchCount}`);
  console.log(`      Not matching: ${airtableIds.size - matchCount}`);
}

console.log('\n7️⃣ Conclusion:');
if (existingIds.size === 0) {
  console.log('   🔴 Database is EMPTY - all articles should be new!');
  console.log('   💡 This might be a different database/environment');
} else if (newArticles.length === 0) {
  console.log('   🟡 All articles already processed');
  console.log('   💡 GitHub Actions might be using same DB as local');
} else {
  console.log('   🟢 New articles found - pipeline should work');
}
