import { supabaseAdmin } from '../db/supabase';

async function checkStats() {
  // Count total records
  const { count: total } = await supabaseAdmin
    .from('shoe_results')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total records in database: ${total}\n`);

  // Brand breakdown
  const { data: brands } = await supabaseAdmin
    .from('shoe_results')
    .select('brand_name');

  const brandCounts = brands?.reduce((acc, { brand_name }) => {
    acc[brand_name] = (acc[brand_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📈 Brand breakdown:');
  Object.entries(brandCounts || {})
    .sort(([, a], [, b]) => b - a)
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}`);
    });

  // Count records with stack data
  const { count: withHeelOrDrop } = await supabaseAdmin
    .from('shoe_results')
    .select('*', { count: 'exact', head: true })
    .or('heel_height.not.is.null,drop.not.is.null');

  console.log(`\n✅ Records with Stack data (heel OR drop): ${withHeelOrDrop}`);

  // Count records missing both heel and drop
  const { count: missingBoth } = await supabaseAdmin
    .from('shoe_results')
    .select('*', { count: 'exact', head: true })
    .is('heel_height', null)
    .is('drop', null);

  console.log(`❌ Records missing both heel AND drop: ${missingBoth}`);

  // Check for "On" brand specifically
  const { data: onBrand } = await supabaseAdmin
    .from('shoe_results')
    .select('brand_name, model, heel_height, drop')
    .eq('brand_name', 'On')
    .limit(10);

  console.log(`\n🔍 Sample "On" brand records (max 10):`);
  if (onBrand && onBrand.length > 0) {
    onBrand.forEach(s => {
      console.log(`  - ${s.brand_name} ${s.model}: heel=${s.heel_height}mm, drop=${s.drop}mm`);
    });
  } else {
    console.log('  (No "On" brand records found)');
  }

  // Surface type stats
  const { data: surfaces } = await supabaseAdmin
    .from('shoe_results')
    .select('surface_type');

  const surfaceCounts = surfaces?.reduce((acc, { surface_type }) => {
    const key = surface_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n🏃 Surface type breakdown:`);
  Object.entries(surfaceCounts || {})
    .sort(([, a], [, b]) => b - a)
    .forEach(([surface, count]) => {
      console.log(`  ${surface}: ${count}`);
    });
}

checkStats().catch(console.error);
