import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkDuplicates() {
  console.log('🔍 Checking Mount to Coast T1 records in shoe_results:\n');

  const { data: shoes, error } = await supabase
    .from('shoe_results')
    .select('*')
    .eq('brand_name', 'Mount to Coast')
    .eq('model', 'T1')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${shoes?.length} records:\n`);

  shoes?.forEach((shoe, idx) => {
    console.log(`Record ${idx + 1}:`);
    console.log(`  ID: ${shoe.id}`);
    console.log(`  Model Key: ${shoe.model_key}`);
    console.log(`  Record ID: ${shoe.record_id}`);
    console.log(`  Article ID: ${shoe.article_id}`);
    console.log(`  Price: $${shoe.price}`);
    console.log(`  Weight: ${shoe.weight}g`);
    console.log(`  Source: ${shoe.source_link}`);
    console.log(`  Created: ${shoe.created_at}`);
    console.log('');
  });

  // Check if they are truly identical
  if (shoes && shoes.length > 1) {
    console.log('🔎 Comparing records...\n');

    const fieldsToCompare = [
      'brand_name', 'model', 'price', 'weight',
      'heel_height', 'forefoot_height', 'drop',
      'primary_use', 'surface_type', 'cushioning_type',
      'foot_width', 'upper_breathability', 'source_link'
    ];

    let identicalCount = 0;
    for (let i = 0; i < shoes.length - 1; i++) {
      for (let j = i + 1; j < shoes.length; j++) {
        const differences = [];

        fieldsToCompare.forEach(field => {
          if (shoes[i][field] !== shoes[j][field]) {
            differences.push(`${field}: "${shoes[i][field]}" vs "${shoes[j][field]}"`);
          }
        });

        if (differences.length === 0) {
          identicalCount++;
          console.log(`⚠️  Records ${i + 1} and ${j + 1} are IDENTICAL (true duplicates)`);
        } else {
          console.log(`ℹ️  Records ${i + 1} and ${j + 1} differ in ${differences.length} fields:`);
          differences.forEach(diff => console.log(`     - ${diff}`));
        }
        console.log('');
      }
    }

    if (identicalCount > 0) {
      console.log(`\n❌ Found ${identicalCount} pair(s) of true duplicates!`);
      console.log('\n💡 Recommendation: Delete one of the duplicate records');
    }
  }

  // Check unique constraint
  console.log('\n🔧 Checking unique constraint...\n');

  const { data: constraints } = await supabase.rpc('exec', {
    sql: `
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'shoe_results'::regclass
      AND contype = 'u'
    `
  });

  if (constraints) {
    console.log('Unique constraints:', constraints);
  } else {
    console.log('✅ No unique constraints (might have been removed)');
  }
}

checkDuplicates();
