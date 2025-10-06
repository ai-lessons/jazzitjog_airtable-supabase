// Test hybrid extraction on Article 234
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

async function test() {
  console.log('🧪 Testing hybrid extraction on Article 234\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });
  const article = ingestResult.articles.find(a => a.article_id === 234);

  if (!article) {
    console.error('❌ Article 234 not found');
    return;
  }

  console.log('📄 Article 234: On Cloudultra 3');
  console.log(`Title: ${article.title}\n`);

  // Extract
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

  console.log('✅ Extraction Result:');
  console.log(`   Method: ${extractResult.extractionMethod}`);
  console.log(`   Sneakers: ${extractResult.sneakers.length}\n`);

  if (extractResult.sneakers.length > 0) {
    const sneaker = extractResult.sneakers[0];
    console.log(`👟 ${sneaker.brand_name} ${sneaker.model}`);
    console.log(`   cushioning_type: ${sneaker.cushioning_type || 'NULL'} (expected: firm)`);
    console.log(`   foot_width: ${sneaker.foot_width || 'NULL'} (expected: narrow)`);
    console.log(`   weight: ${sneaker.weight || 'NULL'}g (expected: 295g)`);
    console.log(`   heel_height: ${sneaker.heel_height || 'NULL'}mm (expected: 32mm)`);
    console.log(`   drop: ${sneaker.drop || 'NULL'}mm (expected: 5.5mm)`);
    console.log(`   waterproof: ${sneaker.waterproof} (expected: null)`);
  }
}

test().catch(console.error);
