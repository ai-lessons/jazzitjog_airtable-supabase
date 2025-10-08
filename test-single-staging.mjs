// Test staging insert with single article
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('🧪 Testing Single Staging Insert\n');

// Get one specific article
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const records = await base(process.env.AIRTABLE_TABLE_NAME)
  .select({
    maxRecords: 1,
    filterByFormula: '{ID} = 18' // PUMA Fast-R Nitro Elite 3
  })
  .firstPage();

if (records.length === 0) {
  console.error('❌ Article not found');
  process.exit(1);
}

const record = records[0];
console.log('📄 Article:', {
  id: record.id,
  title: record.fields.Title,
  hasContent: !!record.fields.Content,
});

// Try to insert minimal test data
console.log('\n💾 Attempting staging insert...');

const testData = {
  brand_name: 'PUMA',
  model: 'Fast-R Nitro Elite 3',
  airtable_id: record.id,
  upper_breathability: 'high',
  carbon_plate: null,
  waterproof: false,
  heel_height: 35,
  forefoot_height: 27,
  drop: 8,
  weight: 170,
  price: null, // staging_table uses 'price' not 'price_usd'
  primary_use: 'racing',
  cushioning_type: 'responsive',
  surface_type: 'road',
  foot_width: 'narrow',
  additional_features: 'carbon plate',
  is_running_shoe: true,
  date: '2025-05-19', // staging_table uses 'date' not 'date_published'
  source_link: record.fields['Article link'] || null,
};

console.log('Data to insert:', testData);

const { data, error } = await supabase
  .from('staging_table')
  .insert(testData)
  .select()
  .single();

if (error) {
  console.error('\n❌ INSERT ERROR:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  // Check staging_table schema
  console.log('\n🔍 Checking staging_table schema...');
  const { data: schemaData, error: schemaError } = await supabase
    .rpc('get_table_columns', { table_name: 'staging_table' })
    .single();

  if (!schemaError && schemaData) {
    console.log('Columns:', schemaData);
  } else {
    // Fallback: try to get schema by querying empty result
    const { data: sample, error: sampleError } = await supabase
      .from('staging_table')
      .select('*')
      .limit(1);

    if (!sampleError && sample && sample.length > 0) {
      console.log('Sample record keys:', Object.keys(sample[0]));
    }
  }
} else {
  console.log('\n✅ SUCCESS!');
  console.log('Inserted ID:', data.id);

  // Verify
  const { data: verify } = await supabase
    .from('staging_table')
    .select('*')
    .eq('id', data.id)
    .single();

  console.log('\n✅ Verified in database:', verify);
}
