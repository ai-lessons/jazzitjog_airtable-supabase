// Check approval_logs table
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkApprovalLogs() {
  console.log('📊 Checking approval_logs table...\n');

  // Check if table exists and has data
  const { data, error, count } = await supabase
    .from('approval_logs')
    .select('*', { count: 'exact' })
    .order('approved_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error accessing approval_logs:', error.message);
    console.log('\n💡 The approval_logs table might not exist yet.');
    console.log('   It should be created when you approve staging items for the first time.');
    return;
  }

  console.log(`✅ Table exists with ${count} records\n`);

  if (count === 0) {
    console.log('📭 No approval logs yet');
    console.log('\n💡 Logs will appear when you:');
    console.log('   1. Have items in staging_table');
    console.log('   2. Approve them via the web interface');
    console.log('   3. They get moved to shoe_results (production)');
  } else {
    console.log('Recent logs:');
    data.forEach((log, i) => {
      console.log(`\n${i + 1}. ${new Date(log.approved_at).toLocaleString()}`);
      console.log(`   - Approved: ${log.total_approved} items`);
      console.log(`   - Total in production: ${log.total_in_shoe_results}`);
      console.log(`   - Brands: ${JSON.stringify(log.brand_counts)}`);
    });
  }
}

checkApprovalLogs();
