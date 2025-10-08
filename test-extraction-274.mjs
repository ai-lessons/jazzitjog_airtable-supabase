// Test extraction for Article 274
import 'dotenv/config';
import Airtable from 'airtable';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

console.log('🔍 Checking Article 274 extraction results...\n');

// Get article from Airtable
const records = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({
    maxRecords: 1,
    filterByFormula: '{ID} = 274'
  })
  .firstPage();

if (records.length === 0) {
  console.error('❌ Article 274 not found in Airtable');
  process.exit(1);
}

const record = records[0];
const airtableId = record.id;

console.log('📄 Article 274:');
console.log('  Airtable ID:', airtableId);
console.log('  Title:', record.fields.Title);

// Check staging_table
console.log('\n1️⃣ Checking staging_table...');
const { data: stagingData, error: stagingError } = await supabase
  .from('staging_table')
  .select('*')
  .eq('airtable_id', airtableId);

if (stagingError) {
  console.error('❌ Error:', stagingError);
} else if (stagingData.length === 0) {
  console.log('⚠️  No records in staging_table');
} else {
  console.log(`✅ Found ${stagingData.length} records in staging_table:`);
  stagingData.forEach(shoe => {
    console.log(`   - ${shoe.brand_name} ${shoe.model}`);
  });
}

// Check shoe_results
console.log('\n2️⃣ Checking shoe_results...');
const { data: prodData, error: prodError } = await supabase
  .from('shoe_results')
  .select('*')
  .eq('record_id', airtableId);

if (prodError) {
  console.error('❌ Error:', prodError);
} else if (prodData.length === 0) {
  console.log('⚠️  No records in shoe_results');
} else {
  console.log(`✅ Found ${prodData.length} records in shoe_results:`);
  prodData.forEach(shoe => {
    console.log(`   - ${shoe.brand_name} ${shoe.model}`);
  });
}

// Show expected shoes from title
console.log('\n3️⃣ Expected from title: "The 10 Best Winter Running Shoes"');
console.log('   Should extract ~10 shoe models');
