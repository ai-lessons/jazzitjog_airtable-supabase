import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const row = {
  brand_name: 'TestBrand',
  model: 'Model Z',
  primary_use: 'training',
  source_link: 'https://example.com/z',
  article_id: 'Z1',
  price: 199.99
};

(async () => {
  const { data, error } = await supabase
    .from('shoe_results')
    .upsert(row, { onConflict: 'article_id,source_link' })
    .select();

  if (error) {
    console.error('Upsert error:', error);
    process.exit(1);
  }
  console.log('Upserted:', data);
})();
