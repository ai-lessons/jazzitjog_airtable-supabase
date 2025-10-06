// Check Article 246 in database
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model, heel_height, forefoot_height, drop')
    .eq('article_id', '246');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Article 246 in database:');
  console.log(JSON.stringify(data, null, 2));
}

check().catch(console.error);
