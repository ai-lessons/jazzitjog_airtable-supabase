// Check what's in the database
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('📊 Checking database state...\n');

  // Get all records
  const { data, error } = await client
    .from('shoe_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data.length} records:\n`);

  data.forEach((record, idx) => {
    console.log(`[${idx + 1}] ${record.brand_name} ${record.model}`);
    console.log(`    model_key: ${record.model_key}`);
    console.log(`    article_id: ${record.article_id}`);
    console.log(`    record_id: ${record.record_id}`);
    console.log(`    created_at: ${record.created_at}`);
    console.log('');
  });

  // Count total
  const { count } = await client
    .from('shoe_results')
    .select('*', { count: 'exact', head: true });

  console.log(`📦 Total records in table: ${count}`);
}

check().catch(console.error);
