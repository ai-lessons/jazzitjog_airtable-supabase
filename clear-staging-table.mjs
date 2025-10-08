// Clear all records from staging_table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('🧹 Clearing staging_table...\n');

// Get current count
const { count: beforeCount, error: countError } = await supabase
  .from('staging_table')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('❌ Error getting count:', countError);
  process.exit(1);
}

console.log(`📊 Current records: ${beforeCount}`);

if (beforeCount === 0) {
  console.log('✅ Table is already empty');
  process.exit(0);
}

// Confirm deletion
console.log('\n⚠️  This will DELETE all records from staging_table');
console.log('Press Ctrl+C to cancel, or wait 3 seconds...');

await new Promise(resolve => setTimeout(resolve, 3000));

// Delete all records
const { error: deleteError } = await supabase
  .from('staging_table')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using always-true condition)

if (deleteError) {
  console.error('❌ Error deleting:', deleteError);
  process.exit(1);
}

// Verify deletion
const { count: afterCount } = await supabase
  .from('staging_table')
  .select('*', { count: 'exact', head: true });

console.log(`\n✅ Deleted ${beforeCount} records`);
console.log(`📊 Remaining: ${afterCount}`);

if (afterCount === 0) {
  console.log('\n🎉 staging_table is now empty and ready for fresh data!');
} else {
  console.warn(`\n⚠️  Warning: ${afterCount} records still remain`);
}
