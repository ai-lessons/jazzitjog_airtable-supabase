import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const { data, error, count } = await supabase
  .from('staging_table')
  .select('*', { count: 'exact' });

if (error) {
  console.error('Error:', error);
} else {
  console.log(`✅ staging_table has ${data.length} rows (count: ${count})`);

  if (data.length > 0) {
    console.log('\nLatest entries:');
    data.slice(-5).forEach(row => {
      console.log(`  - ${row.brand_name} ${row.model} (${row.airtable_id})`);
    });
  }
}
