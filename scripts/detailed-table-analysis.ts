// Detailed analysis of shoe_results table structure
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeTable() {
  console.log('📋 Analyzing shoe_results table structure...\n');

  // Try to insert a minimal valid row to understand structure
  console.log('1️⃣ Testing with minimal valid data:\n');

  const testRow = {
    brand_name: 'Nike',
    model: 'Test Runner',
    model_key: 'nike::test runner',
    article_id: 999,
    record_id: 'test_123',
    price: 150,
    weight: 250,
    drop: 8
  };

  const { data, error } = await client
    .from('shoe_results')
    .insert(testRow)
    .select();

  if (error) {
    console.error('❌ Insert error:', error);
    console.log('\nError details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Insert successful!');
    console.log('\nReturned data:', data);

    if (data && data.length > 0) {
      console.log('\n📊 Table columns from inserted row:');
      const columns = Object.keys(data[0]).sort();
      columns.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  ${col}: ${type} = ${JSON.stringify(value)}`);
      });

      // Clean up test row
      console.log('\n🧹 Cleaning up test row...');
      const { error: deleteError } = await client
        .from('shoe_results')
        .delete()
        .eq('id', data[0].id);

      if (deleteError) {
        console.error('Warning: Could not delete test row:', deleteError);
      } else {
        console.log('✅ Test row deleted');
      }
    }
  }

  // Check row count
  const { count } = await client
    .from('shoe_results')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📦 Total rows in table: ${count}`);

  // Try to get one real row if exists
  console.log('\n2️⃣ Checking for existing data:\n');
  const { data: existingRows, error: selectError } = await client
    .from('shoe_results')
    .select('*')
    .limit(1);

  if (selectError) {
    console.error('❌ Select error:', selectError);
  } else if (existingRows && existingRows.length > 0) {
    console.log('✅ Found existing row:');
    console.log(JSON.stringify(existingRows[0], null, 2));
  } else {
    console.log('⚠️  Table is empty');
  }
}

analyzeTable().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
