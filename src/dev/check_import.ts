import { supabaseAdmin } from '../db/supabase';

async function checkImport() {
  // Count total records
  const { count: total } = await supabaseAdmin
    .from('shoe_results')
    .select('*', { count: 'exact', head: true });

  console.log(`Total records in database: ${total}`);

  // Get sample of newly imported RunRepeat data
  const { data: samples } = await supabaseAdmin
    .from('shoe_results')
    .select('brand_name, model, source_link')
    .like('source_link', '%runrepeat.com%')
    .limit(10);

  console.log('\nSample of imported RunRepeat data:');
  samples?.forEach(s => {
    console.log(`- ${s.brand_name} ${s.model}`);
  });

  // Count RunRepeat records
  const { count: runrepeatCount } = await supabaseAdmin
    .from('shoe_results')
    .select('*', { count: 'exact', head: true })
    .like('source_link', '%runrepeat.com%');

  console.log(`\nTotal RunRepeat records: ${runrepeatCount}`);

  // Brand breakdown
  const { data: brands } = await supabaseAdmin
    .from('shoe_results')
    .select('brand_name')
    .like('source_link', '%runrepeat.com%');

  const brandCounts = brands?.reduce((acc, { brand_name }) => {
    acc[brand_name] = (acc[brand_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBrand breakdown (RunRepeat):');
  Object.entries(brandCounts || {})
    .sort(([, a], [, b]) => b - a)
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}`);
    });
}

checkImport().catch(console.error);
