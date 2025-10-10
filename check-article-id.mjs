import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkArticleId() {
  // Check if article_id is required in shoe_results
  console.log('Checking shoe_results structure...\n');

  const { data: shoes, error } = await supabase
    .from('shoe_results')
    .select('id, article_id, brand_name, model')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample shoe_results records:');
  shoes.forEach(shoe => {
    console.log(`- ${shoe.brand_name} ${shoe.model}: article_id = ${shoe.article_id}`);
  });

  // Check staging_table
  console.log('\n\nChecking staging_table structure...\n');
  const { data: staging, error: stagingError } = await supabase
    .from('staging_table')
    .select('*')
    .limit(1);

  if (stagingError) {
    console.error('Error:', stagingError);
    return;
  }

  if (staging && staging.length > 0) {
    console.log('staging_table columns:', Object.keys(staging[0]));
    console.log('Has article_id?', 'article_id' in staging[0]);
  }
}

checkArticleId();
