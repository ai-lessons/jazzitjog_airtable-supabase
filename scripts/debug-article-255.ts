// Debug Article 255 extraction issue
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

async function debug() {
  console.log('🔍 Debugging Article 255 extraction\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  // Fetch articles and find 255
  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });

  const article255 = ingestResult.articles.find(a => a.article_id === 255);

  if (!article255) {
    console.error('❌ Article 255 not found in first 100 articles');
    return;
  }

  console.log('📄 Article 255:');
  console.log('   ID:', article255.article_id);
  console.log('   Title:', article255.title);
  console.log('   Record ID:', article255.record_id);
  console.log('   Content length:', article255.content.length);
  console.log('\n');

  // Extract
  console.log('🔬 Running extraction...\n');

  const extractResult = await extractFromArticle(
    {
      article_id: article255.article_id,
      record_id: article255.record_id,
      title: article255.title,
      content: article255.content,
      date: article255.date,
      source_link: article255.source_link,
    },
    process.env.OPENAI_API_KEY!
  );

  console.log('✅ Extraction completed:');
  console.log('   Method:', extractResult.extractionMethod);
  console.log('   Title Analysis:', extractResult.titleAnalysis);
  console.log('   Sneakers found:', extractResult.sneakers.length);
  console.log('\n');

  if (extractResult.sneakers.length > 0) {
    console.log('👟 Extracted sneakers:\n');
    extractResult.sneakers.forEach((sneaker, idx) => {
      console.log(`[${idx + 1}] ${sneaker.brand_name} ${sneaker.model}`);
      console.log(`    Weight: ${sneaker.weight || 'null'}g`);
      console.log(`    Drop: ${sneaker.drop || 'null'}mm`);
      console.log(`    Price: $${sneaker.price || 'null'}`);
    });
  }

  // Check what's in DB for this article
  console.log('\n📊 What\'s in database for Article 255:\n');

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbRecords } = await client
    .from('shoe_results')
    .select('*')
    .eq('article_id', '255');

  if (dbRecords && dbRecords.length > 0) {
    dbRecords.forEach((record, idx) => {
      console.log(`[${idx + 1}] ${record.brand_name} ${record.model}`);
      console.log(`    model_key: ${record.model_key}`);
      console.log(`    record_id: ${record.record_id}`);
      console.log(`    created_at: ${record.created_at}`);
    });
  }
}

debug().catch(console.error);
