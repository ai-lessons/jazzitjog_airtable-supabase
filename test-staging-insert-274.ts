// Test staging insert for all 9 shoes from Article 274
import 'dotenv/config';
import Airtable from 'airtable';
import { getSupabaseClient } from './src/integrations/supabase';
import { extractFromArticle } from './src/etl/extract';
import { normalizeSneakers } from './src/etl/normalize';
import { buildShoeInputs } from './src/etl/build';
import { insertShoesToStaging } from './src/etl/upsert/to_staging';

async function main() {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
    .base(process.env.AIRTABLE_BASE_ID!);

  const supabase = getSupabaseClient({
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_KEY!,
  });

  console.log('🔍 Testing STAGING INSERT for Article 274...\n');

  // Get article
  const records = await base(process.env.AIRTABLE_TABLE_NAME!)
    .select({
      maxRecords: 1,
      filterByFormula: '{ID} = 274'
    })
    .firstPage();

  const record = records[0];
  const article = {
    article_id: '274',
    record_id: record.id,
    title: record.fields.Title as string,
    content: record.fields.Content as string,
    date: record.fields.Created || record.fields.Date as string | null,
    source_link: record.fields['Article link'] as string,
  };

  // Extract + Normalize + Build
  console.log('1️⃣ Running pipeline...');
  const extractResult = await extractFromArticle(article, process.env.OPENAI_API_KEY!);
  const normalized = normalizeSneakers(extractResult.sneakers, extractResult.titleAnalysis);
  const buildResults = buildShoeInputs(
    normalized.map(r => r.sneaker),
    {
      article_id: article.article_id,
      record_id: article.record_id,
      date: article.date,
      source_link: article.source_link,
    }
  );

  const shoes = buildResults.map(r => r.shoe);
  console.log(`✅ Built ${shoes.length} shoes\n`);

  // Clear existing staging data for this article
  console.log('2️⃣ Clearing existing staging data...');
  await supabase
    .from('staging_table')
    .delete()
    .eq('airtable_id', record.id);
  console.log('✅ Cleared\n');

  // Insert to staging
  console.log('3️⃣ Inserting to staging...');
  const result = await insertShoesToStaging(supabase, shoes, record.id);

  console.log('\n📊 Result:');
  console.log(`  Total: ${result.total}`);
  console.log(`  Successful: ${result.successful}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Created: ${result.created}`);

  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(err => {
      console.log(`  - ${err.model_key}: ${err.error}`);
    });
  }

  // Verify in database
  console.log('\n4️⃣ Verifying in database...');
  const { data, error } = await supabase
    .from('staging_table')
    .select('brand_name, model')
    .eq('airtable_id', record.id);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Found ${data.length} records:`);
    data.forEach((shoe, i) => {
      console.log(`   ${i + 1}. ${shoe.brand_name} ${shoe.model}`);
    });
  }
}

main().catch(console.error);
