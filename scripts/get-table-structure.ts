// Get full table structure via raw SQL query
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getTableStructure() {
  console.log('📋 Analyzing shoe_results table structure...\n');

  // Get column information
  const columnsQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shoe_results'
    ORDER BY ordinal_position;
  `;

  // Get constraints
  const constraintsQuery = `
    SELECT
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'public.shoe_results'::regclass
    ORDER BY conname;
  `;

  // Get indexes
  const indexesQuery = `
    SELECT
      i.relname as index_name,
      pg_get_indexdef(i.oid) as index_definition
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    WHERE t.relname = 'shoe_results'
      AND t.relnamespace = 'public'::regnamespace
    ORDER BY i.relname;
  `;

  try {
    // Execute queries via RPC
    console.log('📊 Columns:');
    const { data: columns, error: colError } = await client.rpc('exec_sql', {
      sql: columnsQuery
    });

    if (colError) {
      console.error('Error getting columns:', colError);
    } else {
      console.table(columns);
    }

    console.log('\n🔗 Constraints:');
    const { data: constraints, error: constError } = await client.rpc('exec_sql', {
      sql: constraintsQuery
    });

    if (constError) {
      console.error('Error getting constraints:', constError);
    } else {
      console.table(constraints);
    }

    console.log('\n📇 Indexes:');
    const { data: indexes, error: idxError } = await client.rpc('exec_sql', {
      sql: indexesQuery
    });

    if (idxError) {
      console.error('Error getting indexes:', idxError);
    } else {
      console.table(indexes);
    }

    // Get row count
    const { count, error: countError } = await client
      .from('shoe_results')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📦 Total rows: ${count}`);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

getTableStructure();
