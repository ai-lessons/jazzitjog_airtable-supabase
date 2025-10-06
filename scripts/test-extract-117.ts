// Test extraction for Article 117
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

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 200 });
  const article = ingestResult.articles.find(a => a.article_id === 117);

  if (!article) {
    console.error('❌ Article 117 not found');
    return;
  }

  console.log('📄 Article 117: Best Running Shoes for Beginners\n');

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

  console.log(`Method: ${extractResult.extractionMethod}`);
  console.log(`Title Analysis:`, extractResult.titleAnalysis);
  console.log(`Sneakers found: ${extractResult.sneakers.length}\n`);

  extractResult.sneakers.forEach((s, idx) => {
    console.log(`[${idx + 1}] ${s.brand_name} ${s.model}`);
    console.log(`    weight: ${s.weight}g, heel: ${s.heel_height}mm, drop: ${s.drop}mm, plate: ${s.carbon_plate}`);
  });
}

test().catch(console.error);
