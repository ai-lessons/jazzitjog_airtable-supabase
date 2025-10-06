// Drop CHECK constraint directly
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function dropConstraint() {
  console.log('🚀 Dropping CHECK constraint: shoe_results_core_fields_nonempty_chk\n');

  const dropSQL = `
    ALTER TABLE shoe_results
    DROP CONSTRAINT IF EXISTS shoe_results_core_fields_nonempty_chk;
  `;

  console.log('📄 SQL to execute:');
  console.log(dropSQL);
  console.log('\n');

  try {
    // Supabase PostgREST doesn't support DDL directly via client
    // We need to use raw SQL execution

    // Method 1: Try using supabase-js query method
    const { data, error } = await client.rpc('query', { query_text: dropSQL });

    if (error) {
      console.log('⚠️  RPC "query" not available, trying alternative...\n');

      // Method 2: Direct HTTP request to execute SQL
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql: dropSQL })
      });

      if (!response.ok) {
        console.error('❌ HTTP request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);

        console.log('\n📝 Manual execution required:');
        console.log('1. Go to: https://supabase.com/dashboard/project/fqcwpcyxofowscluryej/sql');
        console.log('2. Paste this SQL:');
        console.log(dropSQL);
        console.log('3. Click RUN');

        return;
      }

      const result = await response.json();
      console.log('✅ Constraint dropped successfully!');
      console.log('Result:', result);
    } else {
      console.log('✅ Constraint dropped successfully!');
      if (data) console.log('Result:', data);
    }

    // Verify by trying to insert test data
    console.log('\n🔍 Verifying by testing insert without specs...\n');

    const testShoe = {
      article_id: '999',
      record_id: 'test_constraint_check',
      brand_name: 'Test Brand',
      model: 'Test Model',
      model_key: 'test brand test model',
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
      date: null,
      source_link: null,
    };

    const { data: testData, error: testError } = await client
      .from('shoe_results')
      .insert(testShoe)
      .select()
      .single();

    if (testError) {
      console.error('❌ Test insert failed - constraint may still exist:');
      console.error('   ', testError.message);
    } else {
      console.log('✅ Test insert successful - constraint removed!');
      console.log('   Inserted test record:', testData.id);

      // Clean up test record
      await client.from('shoe_results').delete().eq('id', testData.id);
      console.log('   🧹 Cleaned up test record');
    }

  } catch (err) {
    console.error('💥 Error:', err);
    console.log('\n📝 Please execute manually in Supabase SQL Editor:');
    console.log(dropSQL);
  }
}

dropConstraint().catch(console.error);
