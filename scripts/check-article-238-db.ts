// Check if Article 238 is in the database
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkDB() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('shoe_results')
    .select('*')
    .eq('article_id', 238);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Article 238 in database:');
  console.log(JSON.stringify(data, null, 2));
}

checkDB().catch(console.error);
