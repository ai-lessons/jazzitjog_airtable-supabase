// Show migration SQL to run in Supabase
console.log('📋 MIGRATION 003: Fix staging_table unique constraint\n');
console.log('Run these SQL commands in Supabase SQL Editor:\n');
console.log('━'.repeat(80));
console.log('ALTER TABLE staging_table DROP CONSTRAINT IF EXISTS staging_table_airtable_id_key;');
console.log('ALTER TABLE staging_table ADD CONSTRAINT staging_table_airtable_brand_model_key UNIQUE (airtable_id, brand_name, model);');
console.log('CREATE INDEX IF NOT EXISTS idx_staging_airtable_brand_model ON staging_table(airtable_id, brand_name, model);');
console.log('━'.repeat(80));
console.log('\n✅ After running, test with: npx tsx test-staging-insert-274.ts');
