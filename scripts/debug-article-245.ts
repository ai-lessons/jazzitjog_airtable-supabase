// Debug Article 245 extraction issue (Vomero Premium)
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

async function debug() {
  console.log('🔍 Debugging Article 245 extraction\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  // Fetch articles and find 245
  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });

  const article245 = ingestResult.articles.find(a => a.article_id === 245);

  if (!article245) {
    console.error('❌ Article 245 not found');
    return;
  }

  console.log('📄 Article 245:');
  console.log('   ID:', article245.article_id);
  console.log('   Title:', article245.title);
  console.log('   Record ID:', article245.record_id);
  console.log('   Content length:', article245.content.length);
  console.log('\n');

  // Extract
  console.log('🔬 Running extraction...\n');

  const extractResult = await extractFromArticle(
    {
      article_id: article245.article_id,
      record_id: article245.record_id,
      title: article245.title,
      content: article245.content,
      date: article245.date,
      source_link: article245.source_link,
    },
    process.env.OPENAI_API_KEY!
  );

  console.log('✅ Extraction completed:');
  console.log('   Method:', extractResult.extractionMethod);
  console.log('   Title Analysis:', JSON.stringify(extractResult.titleAnalysis, null, 2));
  console.log('   Sneakers found:', extractResult.sneakers.length);
  console.log('\n');

  if (extractResult.sneakers.length > 0) {
    console.log('👟 Extracted sneakers:\n');
    extractResult.sneakers.forEach((sneaker, idx) => {
      console.log(`[${idx + 1}] ${sneaker.brand_name} ${sneaker.model}`);
      console.log(`    Weight: ${sneaker.weight || 'null'}g`);
      console.log(`    Drop: ${sneaker.drop || 'null'}mm`);
      console.log(`    Price: $${sneaker.price || 'null'}`);
      console.log(`    Cushioning: ${sneaker.cushioning_type || 'null'}`);
      console.log(`    Heel height: ${sneaker.heel_height || 'null'}mm`);
      console.log(`    Forefoot height: ${sneaker.forefoot_height || 'null'}mm`);
    });
  }
}

debug().catch(console.error);
