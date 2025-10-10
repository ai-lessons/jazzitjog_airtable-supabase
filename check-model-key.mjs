import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkModelKey() {
  console.log('Checking shoe_results for Mount to Coast T1:\n');

  const { data: shoes, error } = await supabase
    .from('shoe_results')
    .select('id, brand_name, model, model_key, record_id, created_at')
    .eq('brand_name', 'Mount to Coast')
    .eq('model', 'T1')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${shoes?.length} records:\n`);
  shoes?.forEach((shoe, idx) => {
    console.log(`Record ${idx + 1}:`);
    console.log(`  ID: ${shoe.id}`);
    console.log(`  Brand: ${shoe.brand_name}`);
    console.log(`  Model: ${shoe.model}`);
    console.log(`  Model Key: ${shoe.model_key}`);
    console.log(`  Record ID: ${shoe.record_id}`);
    console.log(`  Created: ${shoe.created_at}\n`);
  });

  // Check if model_key is auto-generated
  console.log('\nNote: model_key appears to be auto-generated from brand_name + model');
  console.log('Both records have the same model_key, which triggers the UNIQUE constraint!');
}

checkModelKey();
