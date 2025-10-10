import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkRecordIds() {
  console.log('🔍 Checking shoe_results record_id and airtable_id...\n');

  const { data: shoes, error } = await supabase
    .from('shoe_results')
    .select('id, brand_name, model, record_id, airtable_id')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Sample records (${shoes?.length}):\n`);
  shoes?.forEach((shoe, idx) => {
    console.log(`${idx + 1}. ${shoe.brand_name} ${shoe.model}`);
    console.log(`   record_id: ${shoe.record_id}`);
    console.log(`   airtable_id: ${shoe.airtable_id}`);
    console.log('');
  });

  // Check staging_table
  console.log('\n🔍 Checking staging_table airtable_id...\n');

  const { data: staging, error: stagingError } = await supabase
    .from('staging_table')
    .select('id, brand_name, model, airtable_id')
    .limit(5);

  if (stagingError) {
    console.error('Error:', stagingError);
    return;
  }

  console.log(`Sample staging records (${staging?.length}):\n`);
  staging?.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.brand_name} ${item.model}`);
    console.log(`   airtable_id: ${item.airtable_id}`);
    console.log('');
  });

  // Recommendation
  console.log('\n💡 Analysis:\n');
  const hasRecordIds = shoes?.some(s => s.record_id !== null);
  const hasAirtableIds = shoes?.some(s => s.airtable_id !== null);

  console.log(`- shoe_results has record_id values: ${hasRecordIds ? 'YES' : 'NO'}`);
  console.log(`- shoe_results has airtable_id values: ${hasAirtableIds ? 'YES' : 'NO'}`);

  if (hasRecordIds && !hasAirtableIds) {
    console.log('\n✅ Solution: Copy record_id to airtable_id for existing records');
    console.log('   Run: UPDATE shoe_results SET airtable_id = record_id WHERE airtable_id IS NULL AND record_id IS NOT NULL;');
  }
}

checkRecordIds();
