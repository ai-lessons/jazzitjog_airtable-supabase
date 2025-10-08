// Apply migration 002 to staging_table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('📦 Applying migration 002: Fix staging_table columns\n');

const statements = [
  "ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS additional_features TEXT",
  "ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_running_shoe BOOLEAN DEFAULT true",
  "CREATE INDEX IF NOT EXISTS idx_staging_brand_model ON staging_table(brand_name, model)",
  "CREATE INDEX IF NOT EXISTS idx_staging_is_running_shoe ON staging_table(is_running_shoe)"
];

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  console.log(`[${i + 1}/${statements.length}] ${stmt.slice(0, 80)}...`);

  const { error } = await supabase.rpc('exec_sql', { sql: stmt });

  if (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }

  console.log(`✅ Success\n`);
}

console.log('🎉 Migration completed!\n');

// Test insert
console.log('🧪 Testing insert...');
const testData = {
  brand_name: 'TEST',
  model: 'Test Model',
  airtable_id: 'test_' + Date.now(),
  additional_features: 'test feature',
  is_running_shoe: true,
};

const { data, error } = await supabase
  .from('staging_table')
  .insert(testData)
  .select()
  .single();

if (error) {
  console.error('❌ Test insert failed:', error);
} else {
  console.log('✅ Test insert successful:', data.id);

  // Clean up test data
  await supabase.from('staging_table').delete().eq('id', data.id);
  console.log('🧹 Cleaned up test data');
}
