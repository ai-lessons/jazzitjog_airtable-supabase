import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fqcwpcyxofowscluryej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxY3dwY3l4b2Zvd3NjbHVyeWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgyNjM5MywiZXhwIjoyMDczNDAyMzkzfQ.QosWygGvcAcHKXVq8RBXXGCJ_DY5YIvOuPM2kl92zFM'
);

console.log('Testing search query...\n');

const { data, error, count } = await supabase
  .from('shoe_results')
  .select(
    'id,brand_name,model,primary_use,surface_type,heel_height,forefoot_height,drop,weight,price,carbon_plate,waterproof,date,source_link,cushioning_type,foot_width,upper_breathability',
    { count: 'exact' }
  )
  .order('price', { ascending: true, nullsFirst: true })
  .range(0, 49);

if (error) {
  console.log('❌ Error:', error);
  console.log('   Code:', error.code);
  console.log('   Details:', error.details);
  console.log('   Hint:', error.hint);
} else {
  console.log('✅ Query successful');
  console.log('   Total count:', count);
  console.log('   Rows returned:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('\n   First row:', JSON.stringify(data[0], null, 2));
  }
}
