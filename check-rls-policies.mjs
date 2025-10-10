import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_KEY;

console.log('Using service key:', supabaseServiceKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function testInsert() {
  try {
    console.log('\n1. Testing insert into shoe_results with service role...\n');

    const testData = {
      brand_name: 'Test Brand',
      model: 'Test Model',
      primary_use: 'road running',
      surface_type: 'road',
      price: 100
    };

    const { data, error } = await supabase
      .from('shoe_results')
      .insert([testData])
      .select();

    if (error) {
      console.error('❌ Insert failed:', error);
      return;
    }

    console.log('✅ Insert succeeded!', data);

    // Clean up
    if (data && data.length > 0) {
      console.log('\nCleaning up test data...');
      await supabase
        .from('shoe_results')
        .delete()
        .eq('id', data[0].id);
      console.log('✅ Test data removed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testInsert();
