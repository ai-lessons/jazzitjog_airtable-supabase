// Test extraction from single article
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';
import { normalizeSneakers } from '../src/etl/normalize';
import { buildShoeInputs } from '../src/etl/build';

async function test() {
  console.log('📥 Fetching 1 article from Airtable...\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, {
    maxRecords: 1,
  });

  console.log('📄 Article:', {
    article_id: ingestResult.articles[0].article_id,
    title: ingestResult.articles[0].title.substring(0, 100),
    record_id: ingestResult.articles[0].record_id,
  });

  const article = ingestResult.articles[0];

  console.log('\n🔍 Extracting sneakers...\n');

  const extractResult = await extractFromArticle(
    {
      article_id: article.article_id,
      record_id: article.record_id,
      title: article.title,
      content: article.content,
      date: article.date,
      source_link: article.source_link,
    },
    process.env.OPENAI_API_KEY!
  );

  console.log('✅ Extracted:', extractResult.sneakers.length, 'sneakers');
  console.log('Method:', extractResult.extractionMethod);

  console.log('\n👟 Sneakers:\n');
  extractResult.sneakers.forEach((sneaker, idx) => {
    console.log(`[${idx + 1}]`, {
      brand: sneaker.brand_name,
      model: sneaker.model,
      weight: sneaker.weight,
      drop: sneaker.drop,
      price: sneaker.price,
    });
  });

  console.log('\n🔄 Normalizing...\n');

  const normalizeResults = normalizeSneakers(extractResult.sneakers);

  console.log('\n🏗️ Building ShoeInput...\n');

  const buildResults = buildShoeInputs(
    normalizeResults.map(r => r.sneaker),
    {
      article_id: article.article_id,
      record_id: article.record_id,
      date: article.date,
      source_link: article.source_link,
    }
  );

  console.log('📦 Built shoes:', buildResults.length);

  buildResults.forEach((result, idx) => {
    console.log(`\n[${idx + 1}] ${result.shoe.brand_name} ${result.shoe.model}`);
    console.log('   model_key:', result.shoe.model_key);
    console.log('   article_id:', result.shoe.article_id, '(type:', typeof result.shoe.article_id + ')');
    console.log('   record_id:', result.shoe.record_id);
    console.log('   Full object:', JSON.stringify(result.shoe, null, 2));
  });
}

test().catch(console.error);
