// Get shoe_results table schema from Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getTableSchema() {
  try {
    // Try to insert an empty object to get the column list from error
    const { error } = await client
      .from('shoe_results')
      .insert({})
      .select();

    console.log('Schema detection via insert attempt:');
    console.log('Error:', error);

    // Also try to get actual data if table is not empty
    const { data, error: selectError } = await client
      .from('shoe_results')
      .select('*')
      .limit(1);

    if (data && data.length > 0) {
      console.log('\nActual columns from data:');
      console.log(Object.keys(data[0]).sort());
      console.log('\nSample row:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\nTable is empty, columns inferred from type system');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

getTableSchema();
