// Analyze article content
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function analyze() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, {
    maxRecords: 1,
  });

  const article = ingestResult.articles[0];

  console.log('📄 Article:', article.title);
  console.log('   ID:', article.article_id);
  console.log('   Length:', article.content.length, 'chars');
  console.log('\n');
  console.log('📝 Content preview (first 2000 chars):\n');
  console.log(article.content.substring(0, 2000));
  console.log('\n...\n');
  console.log('📝 Content end (last 1000 chars):\n');
  console.log(article.content.substring(article.content.length - 1000));
}

analyze().catch(console.error);
