// Check existing indexes on shoe_results table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIndexes() {
  try {
    console.log('🔍 Checking indexes on shoe_results table...\n');

    // Query pg_indexes to get all indexes
    const { data, error } = await client
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'shoe_results');

    if (error) {
      console.error('Error querying indexes:', error);
      console.log('\nTrying alternative method via SQL query...\n');

      // Alternative: try raw query if pg_indexes view is not accessible
      const query = `
        SELECT
          i.relname as indexname,
          pg_get_indexdef(i.oid) as indexdef
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        WHERE t.relname = 'shoe_results'
        ORDER BY i.relname;
      `;

      console.log('SQL query:', query);
      console.log('\nNote: You may need to run this query directly in Supabase SQL Editor');
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No indexes found on shoe_results table');
      return;
    }

    console.log(`✅ Found ${data.length} indexes:\n`);

    data.forEach(index => {
      console.log(`📌 ${index.indexname}`);
      console.log(`   ${index.indexdef}\n`);
    });

    // Check for required indexes
    const indexNames = data.map(idx => idx.indexname.toLowerCase());

    console.log('\n📋 Required indexes check:');

    const requiredIndexes = [
      { name: 'search_vector', type: 'GIN', desc: 'Full-text search on search_vector' },
      { name: 'brand_name', type: 'B-tree', desc: 'Fast lookups by brand' },
      { name: 'model', type: 'B-tree', desc: 'Fast lookups by model' },
      { name: 'model_key', type: 'B-tree/Unique', desc: 'Unique constraint on model_key' },
      { name: 'record_id_model_key', type: 'Unique', desc: 'Composite unique on (record_id, model_key)' },
    ];

    requiredIndexes.forEach(req => {
      const exists = indexNames.some(name => name.includes(req.name.toLowerCase()));
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${req.desc}`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkIndexes();
