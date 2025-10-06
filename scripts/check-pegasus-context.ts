// Check Nike Pegasus context in Article 117
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function check() {
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

  // Find all occurrences of Nike Pegasus
  const matches = [];
  const regex = /Nike\s+Pegasus.{0,100}/gi;
  let match;

  while ((match = regex.exec(article.content)) !== null) {
    matches.push({
      index: match.index,
      text: match[0]
    });
  }

  console.log(`Found ${matches.length} Nike Pegasus mentions:\n`);

  matches.forEach((m, idx) => {
    console.log(`[${idx + 1}] Index ${m.index}:`);
    console.log(`    "${m.text}"`);
    console.log();
  });
}

check().catch(console.error);
