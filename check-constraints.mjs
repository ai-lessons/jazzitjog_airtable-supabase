import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkConstraints() {
  // Check for unique constraints on shoe_results
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'shoe_results'
      AND n.nspname = 'public'
      AND contype IN ('u', 'p');
    `
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Constraints on shoe_results table:\n');
  if (data && data.length > 0) {
    data.forEach(constraint => {
      console.log(`- ${constraint.constraint_name} (${constraint.constraint_type}):`);
      console.log(`  ${constraint.constraint_definition}\n`);
    });
  } else {
    console.log('No unique/primary constraints found');
  }

  // Check shoe_results records
  console.log('\n\nChecking Mount to Coast records:');
  const { data: shoes, error: shoesError } = await supabase
    .from('shoe_results')
    .select('id, brand_name, model, created_at')
    .ilike('brand_name', '%mount%coast%');

  if (shoesError) {
    console.error('Error:', shoesError);
  } else {
    console.log(`Found ${shoes?.length} records:`);
    shoes?.forEach(shoe => {
      console.log(`- ${shoe.brand_name} ${shoe.model} (created: ${shoe.created_at})`);
    });
  }
}

checkConstraints();
