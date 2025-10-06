// Test manual upsert
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log('🧪 Testing manual upsert...\n');

  const testShoe = {
    article_id: '258',
    record_id: 'recMFZrCBFDC7eE5j',
    brand_name: 'Adidas',
    model: 'Ultraboost 5X',
    model_key: 'adidas ultraboost 5x',
    heel_height: null,
    forefoot_height: null,
    drop: null,
    weight: null,
    price: null,
    upper_breathability: null,
    carbon_plate: null,
    waterproof: null,
    primary_use: null,
    cushioning_type: null,
    surface_type: null,
    foot_width: null,
    additional_features: null,
    date: '2025-09-30T20:39:00.000Z',
    source_link: 'https://www.runnersworld.com/gear/a22170339/best-adidas-shoes/',
  };

  console.log('📦 Test shoe:');
  console.log('   Brand:', testShoe.brand_name);
  console.log('   Model:', testShoe.model);
  console.log('   model_key:', testShoe.model_key);
  console.log('   article_id:', testShoe.article_id);
  console.log('   record_id:', testShoe.record_id);
  console.log('\n');

  // Try upsert
  console.log('💾 Attempting upsert with onConflict: record_id,model_key...\n');

  const { data, error } = await client
    .from('shoe_results')
    .upsert(testShoe, {
      onConflict: 'record_id,model_key',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Upsert failed:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    console.error('\n');
    console.error('Full error object:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Upsert successful!');
    console.log('   ID:', data.id);
    console.log('   Created at:', data.created_at);
  }
}

test().catch(console.error);
