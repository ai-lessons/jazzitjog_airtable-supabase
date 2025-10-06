import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // для теста используем сервисный, в браузере будет anon
  { auth: { persistSession: false } }
);

(async () => {
  const { data, error } = await supabase.rpc('search_shoes', {
    p_q: 'vaporfly',
    p_brands: ['Nike'],
    p_limit: 5,
    p_offset: 0
  });

  if (error) {
    console.error('RPC error:', error);
    process.exit(1);
  }
  console.log('Rows:', data?.length ?? 0);
  console.log(data?.slice(0, 3));
})();
