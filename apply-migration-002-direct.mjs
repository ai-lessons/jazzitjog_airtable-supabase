// Apply migration 002 - Show SQL commands to run manually
import 'dotenv/config';

console.log('📋 MIGRATION 002: Fix staging_table columns\n');
console.log('Run these SQL commands in Supabase SQL Editor:');
console.log('(Supabase Dashboard → SQL Editor → New query)\n');
console.log('━'.repeat(80));
console.log('ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS additional_features TEXT;');
console.log('ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_running_shoe BOOLEAN DEFAULT true;');
console.log('CREATE INDEX IF NOT EXISTS idx_staging_brand_model ON staging_table(brand_name, model);');
console.log('CREATE INDEX IF NOT EXISTS idx_staging_is_running_shoe ON staging_table(is_running_shoe);');
console.log('━'.repeat(80));
console.log('\n✅ After running the migration, test with:');
console.log('   node test-single-staging.mjs');
