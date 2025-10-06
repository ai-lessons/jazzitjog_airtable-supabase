// Check Article 237 for waterproof mentions
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function check() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });
  const article = ingestResult.articles.find(a => a.article_id === 237);

  if (!article) {
    console.error('❌ Article 237 not found');
    return;
  }

  console.log('📄 Article 237: KAILAS FUGA EX 330');
  console.log(`Content length: ${article.content.length}\n`);

  // Search for waterproof mentions
  const waterproofMatches = article.content.match(/.{0,100}waterproof.{0,100}/gi);
  console.log('Waterproof mentions:', waterproofMatches?.length || 0);
  if (waterproofMatches) {
    waterproofMatches.forEach((match, idx) => {
      console.log(`\n[${idx + 1}] ${match}`);
    });
  }

  // Check for "not waterproof"
  const notWaterproof = /\b(?:not|no|non)[^.]{0,50}water(?:proof|resistant)/i.test(article.content);
  console.log('\nContains "not waterproof":', notWaterproof);
}

check().catch(console.error);
