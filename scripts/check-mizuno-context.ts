// Check Mizuno Wave context in Article 117
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

  // Find all occurrences of Mizuno
  const mizunoMatches = [];
  const regex = /Mizuno.{0,100}/gi;
  let match;

  while ((match = regex.exec(article.content)) !== null) {
    mizunoMatches.push({
      index: match.index,
      text: match[0]
    });
  }

  console.log(`Found ${mizunoMatches.length} Mizuno mentions:\n`);

  mizunoMatches.forEach((m, idx) => {
    console.log(`[${idx + 1}] Index ${m.index}:`);
    console.log(`    "${m.text}"`);
    console.log();
  });
}

check().catch(console.error);
