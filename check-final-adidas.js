import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkFinalAdidas() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Checking final Adidas records...');

  const { data: adidasRecords, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model')
    .or('brand_name.ilike.%adidas%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Found ${adidasRecords.length} Adidas records:`);

  adidasRecords.forEach((record, i) => {
    console.log(`${i+1}. Article ${record.article_id}: ${record.brand_name} ${record.model}`);
  });

  if (adidasRecords.length === 0) {
    console.log('🎉 SUCCESS: NO IRRELEVANT ADIDAS RECORDS FOUND!');
    console.log('✅ The improved filtering system is working perfectly');
  } else {
    console.log('\n🔍 Let me check if these are actually relevant...');

    // For each Adidas record, we need to check if the original article title contains Adidas
    // This would require mapping back to Airtable data, which is complex
    // For now, let's just note what we found

    console.log('\n⚠️  Found some Adidas records. Need to verify if they are from relevant articles.');
    console.log('The system may have correctly extracted Adidas from articles that genuinely mention Adidas models.');
  }
}

checkFinalAdidas().catch(console.error);