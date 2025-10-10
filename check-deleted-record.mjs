import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkDeletedRecord() {
  console.log('Checking approval_logs for the deleted record...\n');

  // Check approval logs - they might contain information about what was approved
  const { data: logs, error: logsError } = await supabase
    .from('approval_logs')
    .select('*')
    .order('approved_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.error('Error fetching logs:', logsError);
  } else {
    console.log(`Found ${logs?.length} recent approval logs:\n`);
    logs?.forEach((log, idx) => {
      console.log(`Log ${idx + 1}:`);
      console.log(`  Approved at: ${log.approved_at}`);
      console.log(`  Total approved: ${log.total_approved}`);
      console.log(`  Brands:`, log.brand_counts);
      console.log(`  Item IDs:`, log.metadata?.item_ids);
      console.log('');
    });
  }

  // Check if there's a deleted record in staging_table (might still be there)
  console.log('\nChecking staging_table for Mount to Coast T1...\n');
  const { data: staging, error: stagingError } = await supabase
    .from('staging_table')
    .select('*')
    .eq('brand_name', 'Mount to Coast')
    .eq('model', 'T1');

  if (stagingError) {
    console.error('Error:', stagingError);
  } else if (staging && staging.length > 0) {
    console.log('✅ Found in staging_table (not deleted yet):');
    staging.forEach(item => {
      console.log(`  ID: ${item.id}`);
      console.log(`  Airtable ID: ${item.airtable_id}`);
      console.log(`  Created: ${item.created_at}`);
    });
  } else {
    console.log('❌ Not found in staging_table (already approved and deleted)');
  }

  // Check current shoe_results
  console.log('\n\nCurrent shoe_results for Mount to Coast T1:\n');
  const { data: shoes, error: shoesError } = await supabase
    .from('shoe_results')
    .select('*')
    .eq('brand_name', 'Mount to Coast')
    .eq('model', 'T1')
    .order('created_at', { ascending: false });

  if (shoesError) {
    console.error('Error:', shoesError);
  } else {
    console.log(`Found ${shoes?.length} records:\n`);
    shoes?.forEach((shoe, idx) => {
      console.log(`Record ${idx + 1}:`);
      console.log(`  ID: ${shoe.id}`);
      console.log(`  Price: $${shoe.price}`);
      console.log(`  Source: ${shoe.source_link}`);
      console.log(`  Article ID: ${shoe.article_id}`);
      console.log(`  Created: ${shoe.created_at}\n`);
    });
  }

  console.log('\n💡 Recovery options:');
  console.log('1. Check Supabase Dashboard → Database → Backups (if PITR enabled)');
  console.log('2. Check if old record had different article_id or source_link');
  console.log('3. If data came from Airtable, it can be re-imported from there');
}

checkDeletedRecord();
