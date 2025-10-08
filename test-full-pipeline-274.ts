// Test full pipeline for Article 274
import 'dotenv/config';
import Airtable from 'airtable';
import { getSupabaseClient } from './src/integrations/supabase';
import { extractFromArticle } from './src/etl/extract';
import { normalizeSneakers } from './src/etl/normalize';
import { buildShoeInputs } from './src/etl/build';

async function main() {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
    .base(process.env.AIRTABLE_BASE_ID!);

  console.log('🔍 Testing FULL pipeline for Article 274...\n');

  // Get article
  const records = await base(process.env.AIRTABLE_TABLE_NAME!)
    .select({
      maxRecords: 1,
      filterByFormula: '{ID} = 274'
    })
    .firstPage();

  if (records.length === 0) {
    console.error('❌ Article 274 not found');
    process.exit(1);
  }

  const record = records[0];
  const article = {
    article_id: '274',
    record_id: record.id,
    title: record.fields.Title as string,
    content: record.fields.Content as string,
    date: record.fields.Created || record.fields.Date as string | null,
    source_link: record.fields['Article link'] as string,
  };

  console.log('📄 Article:', article.title);

  // Step 2: Extract
  console.log('\n1️⃣ EXTRACT:');
  const extractResult = await extractFromArticle(
    article,
    process.env.OPENAI_API_KEY!
  );

  console.log(`✅ Extracted: ${extractResult.sneakers.length} sneakers`);
  extractResult.sneakers.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.brand_name} ${s.model}`);
  });

  // Step 3: Normalize
  console.log('\n2️⃣ NORMALIZE:');
  const normalized = normalizeSneakers(
    extractResult.sneakers,
    extractResult.titleAnalysis
  );

  console.log(`✅ After normalization: ${normalized.length} sneakers`);
  normalized.forEach((result, i) => {
    console.log(`   ${i + 1}. ${result.sneaker.brand_name} ${result.sneaker.model} (confidence: ${result.confidence})`);
  });

  // Step 4: Build
  console.log('\n3️⃣ BUILD:');
  const buildResults = buildShoeInputs(
    normalized.map(r => r.sneaker),
    {
      article_id: article.article_id,
      record_id: article.record_id,
      date: article.date,
      source_link: article.source_link,
    }
  );

  console.log(`✅ After build: ${buildResults.length} shoes`);
  buildResults.forEach((result, i) => {
    console.log(`   ${i + 1}. ${result.shoe.brand_name} ${result.shoe.model} (model_key: ${result.shoe.model_key})`);
  });

  console.log('\n📊 Summary:');
  console.log(`   Extracted: ${extractResult.sneakers.length}`);
  console.log(`   Normalized: ${normalized.length}`);
  console.log(`   Built: ${buildResults.length}`);
  console.log(`   Loss: ${extractResult.sneakers.length - buildResults.length} shoes`);

  if (extractResult.sneakers.length !== buildResults.length) {
    console.log('\n⚠️  SHOES LOST during pipeline!');
    const extractedKeys = new Set(extractResult.sneakers.map(s => `${s.brand_name} ${s.model}`));
    const builtKeys = new Set(buildResults.map(r => `${r.shoe.brand_name} ${r.shoe.model}`));

    console.log('\n❌ Lost shoes:');
    for (const key of extractedKeys) {
      if (!builtKeys.has(key)) {
        console.log(`   - ${key}`);
      }
    }
  }
}

main().catch(console.error);
