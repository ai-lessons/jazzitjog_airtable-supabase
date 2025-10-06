// Check all Nike mentions in Article 117
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

  // Find all Nike mentions
  const matches = [];
  const regex = /Nike\s+[A-Za-z\s]+(?:\d+[a-z]*)?/gi;
  let match;

  while ((match = regex.exec(article.content)) !== null) {
    matches.push({
      index: match.index,
      text: match[0].trim()
    });
  }

  console.log(`Found ${matches.length} Nike mentions:\n`);

  // Deduplicate
  const uniqueMatches = Array.from(new Set(matches.map(m => m.text)));

  uniqueMatches.forEach((text, idx) => {
    console.log(`[${idx + 1}] "${text}"`);
  });
}

check().catch(console.error);
