// Check what exactly blocks articles from being "new"
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

console.log('🔍 What prevents articles from being "new"?\n');

// Get sample Airtable articles
const airtableRecords = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({ maxRecords: 10 })
  .firstPage();

console.log(`1️⃣ Sample articles from Airtable: ${airtableRecords.length}`);
const airtableIds = airtableRecords.map(r => r.id);
console.log('   IDs:', airtableIds.slice(0, 5));

// Check staging_table
const { data: stagingData } = await supabase
  .from('staging_table')
  .select('airtable_id')
  .in('airtable_id', airtableIds);

console.log(`\n2️⃣ Found in staging_table: ${stagingData?.length || 0}`);
if (stagingData && stagingData.length > 0) {
  console.log('   These Airtable IDs are in staging_table:');
  stagingData.forEach(row => console.log(`   - ${row.airtable_id}`));
}

// Check shoe_results
const { data: prodData } = await supabase
  .from('shoe_results')
  .select('record_id')
  .in('record_id', airtableIds);

console.log(`\n3️⃣ Found in shoe_results: ${prodData?.length || 0}`);
if (prodData && prodData.length > 0) {
  console.log('   These Airtable IDs are in shoe_results:');
  prodData.forEach(row => console.log(`   - ${row.record_id}`));
}

// Determine what's blocking
const blockedByStaging = new Set(stagingData?.map(r => r.airtable_id) || []);
const blockedByProd = new Set(prodData?.map(r => r.record_id) || []);
const allBlocked = new Set([...blockedByStaging, ...blockedByProd]);

console.log(`\n4️⃣ Analysis:`);
console.log(`   Blocked by staging_table: ${blockedByStaging.size}`);
console.log(`   Blocked by shoe_results: ${blockedByProd.size}`);
console.log(`   Total blocked: ${allBlocked.size}`);
console.log(`   NEW (not blocked): ${airtableRecords.length - allBlocked.size}`);

// Show which articles are truly new
const newArticles = airtableRecords.filter(r => !allBlocked.has(r.id));

console.log(`\n5️⃣ TRULY NEW articles: ${newArticles.length}`);
if (newArticles.length > 0) {
  newArticles.forEach(r => {
    console.log(`   ✅ ${r.id} - ${r.fields.Title?.slice(0, 60)}`);
  });
} else {
  console.log('   ⚠️  NO NEW ARTICLES');
}

// Show what blocks each article
console.log('\n6️⃣ Detailed blocking info:');
airtableRecords.slice(0, 5).forEach(r => {
  const inStaging = blockedByStaging.has(r.id);
  const inProd = blockedByProd.has(r.id);
  const status = (!inStaging && !inProd) ? '✅ NEW' :
                 (inStaging && inProd) ? '❌ In BOTH' :
                 inStaging ? '⚠️ In staging' : '⚠️ In production';

  console.log(`   ${r.id}: ${status}`);
  console.log(`      Title: ${r.fields.Title?.slice(0, 50)}`);
});

// Solution
console.log('\n7️⃣ Solution to make ALL articles "new":');
if (blockedByStaging.size > 0) {
  console.log(`   🧹 Clear staging_table (${blockedByStaging.size} records block articles)`);
}
if (blockedByProd.size > 0) {
  console.log(`   🧹 Clear shoe_results (${blockedByProd.size} records block articles)`);
}
if (allBlocked.size === 0) {
  console.log('   ✅ No blocking - all articles are already "new"!');
}
