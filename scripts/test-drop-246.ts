// Test drop extraction for Article 246
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

async function test() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });
  const article = ingestResult.articles.find(a => a.article_id === 246);

  if (!article) {
    console.error('❌ Article 246 not found');
    return;
  }

  console.log('📄 Article 246: Notace Yama T1\n');

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

  console.log('Extraction Result:');
  if (extractResult.sneakers.length > 0) {
    const sneaker = extractResult.sneakers[0];
    console.log(`  heel_height: ${sneaker.heel_height}mm`);
    console.log(`  forefoot_height: ${sneaker.forefoot_height}mm`);
    console.log(`  drop: ${sneaker.drop}mm (expected: 0mm)`);
  }
}

test().catch(console.error);
