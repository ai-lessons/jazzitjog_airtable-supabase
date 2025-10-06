import { supabaseAdmin } from '../db/supabase';

(async () => {
  const { count, error } = await supabaseAdmin
    .from('shoe_results')
    .select('id', { count: 'exact', head: true });
  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }
  console.log('✅ Supabase OK. shoe_results count =', count);
})();
