import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function addColumn() {
  try {
    console.log('🚀 Adding is_edited column to staging_table...');

    // Execute SQL directly
    const { data, error } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE'
    });

    if (error) {
      // Try alternative method if exec doesn't exist
      console.log('⚠️ exec RPC not found, trying alternative...');

      // Use raw query through REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    }

    console.log('✅ Column added successfully!');

    // Test by selecting from staging_table
    const { data: testData, error: testError } = await supabase
      .from('staging_table')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('⚠️ Test query error:', testError);
    } else {
      console.log('✅ staging_table is accessible');
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

addColumn();
