// Debug Article 246 - zero drop detection
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function debug() {
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

  console.log('📄 Article 246: Notace Yama T1');
  console.log(`Title: ${article.title}\n`);

  // Search for drop mentions
  const dropMatches = article.content.match(/.{0,100}drop.{0,100}/gi);
  console.log('Drop mentions:', dropMatches?.length || 0);
  if (dropMatches) {
    dropMatches.forEach((match, idx) => {
      console.log(`\n[${idx + 1}] ${match}`);
    });
  }

  // Search for zero-drop
  const zeroDropMatch = article.content.match(/.{0,100}zero.{0,100}drop.{0,100}/gi);
  console.log('\n\nZero-drop mentions:', zeroDropMatch?.length || 0);
  if (zeroDropMatch) {
    zeroDropMatch.forEach((match, idx) => {
      console.log(`\n[${idx + 1}] ${match}`);
    });
  }

  // Search for 0mm
  const zeroMmMatch = article.content.match(/.{0,100}\b0\s*mm\b.{0,100}/gi);
  console.log('\n\n"0mm" mentions:', zeroMmMatch?.length || 0);
  if (zeroMmMatch) {
    zeroMmMatch.slice(0, 5).forEach((match, idx) => {
      console.log(`\n[${idx + 1}] ${match}`);
    });
  }
}

debug().catch(console.error);
