import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function removeDuplicate() {
  // Delete the older duplicate (keep the newest one)
  const idToDelete = '26182254-cdc1-491e-a5b2-d61ca64a1cbb'; // Older record

  console.log(`🗑️  Removing duplicate record: ${idToDelete}\n`);

  const { error } = await supabase
    .from('shoe_results')
    .delete()
    .eq('id', idToDelete);

  if (error) {
    console.error('❌ Failed to delete:', error);
  } else {
    console.log('✅ Duplicate removed successfully!\n');

    // Verify
    const { data: remaining, error: checkError } = await supabase
      .from('shoe_results')
      .select('id, created_at')
      .eq('brand_name', 'Mount to Coast')
      .eq('model', 'T1');

    if (checkError) {
      console.error('Error checking:', checkError);
    } else {
      console.log(`Remaining Mount to Coast T1 records: ${remaining?.length}`);
      remaining?.forEach(r => {
        console.log(`  - ID: ${r.id}, Created: ${r.created_at}`);
      });
    }
  }
}

removeDuplicate();
