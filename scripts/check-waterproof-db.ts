// Check waterproof values in database
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model, surface_type, waterproof')
    .in('article_id', ['237', '252'])
    .order('article_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Waterproof values for trail shoes:');
  console.log(JSON.stringify(data, null, 2));
}

check().catch(console.error);
