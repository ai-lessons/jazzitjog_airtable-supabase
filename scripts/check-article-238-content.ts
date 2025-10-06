// Check Article 238 content for stack height patterns
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function checkContent() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });
  const article = ingestResult.articles.find(a => a.article_id === 238);

  if (!article) {
    console.error('Article 238 not found');
    return;
  }

  const content = article.content;

  // Search for stack height patterns
  console.log('🔍 Searching for stack height patterns in Article 238...\n');

  // Search for "Vorfuß" and "Ferse"
  const vorfussIndex = content.toLowerCase().indexOf('vorfuß');
  const vorfussIndex2 = content.toLowerCase().indexOf('vorfuss');
  const ferseIndex = content.toLowerCase().indexOf('ferse');

  console.log('Pattern search results:');
  console.log(`- "Vorfuß" found at index: ${vorfussIndex}`);
  console.log(`- "Vorfuss" found at index: ${vorfussIndex2}`);
  console.log(`- "Ferse" found at index: ${ferseIndex}\n`);

  if (vorfussIndex > -1) {
    console.log('Context around "Vorfuß":');
    console.log(content.substring(vorfussIndex - 100, vorfussIndex + 100));
    console.log('\n---\n');
  }

  if (vorfussIndex2 > -1) {
    console.log('Context around "Vorfuss":');
    console.log(content.substring(vorfussIndex2 - 100, vorfussIndex2 + 100));
    console.log('\n---\n');
  }

  if (ferseIndex > -1) {
    console.log('Context around "Ferse":');
    console.log(content.substring(ferseIndex - 100, ferseIndex + 100));
    console.log('\n---\n');
  }

  // Search for "Sprengung"
  const sprengungIndex = content.toLowerCase().indexOf('sprengung');
  console.log(`\n"Sprengung" found at index: ${sprengungIndex}`);

  if (sprengungIndex > -1) {
    console.log('Context around "Sprengung":');
    console.log(content.substring(sprengungIndex - 100, sprengungIndex + 200));
    console.log('\n---\n');
  }

  // Test German patterns
  console.log('\n🧪 Testing German patterns:\n');

  const germanPattern = content.match(/(\d+(?:\.\d+)?)\s*mm\s+vorfuß[^0-9]+(\d+(?:\.\d+)?)\s*mm\s*ferse/i);
  console.log('Pattern 1 (forefoot/heel):', germanPattern);

  const germanReversePattern = content.match(/(\d+(?:\.\d+)?)\s*mm\s*ferse[^0-9]+(\d+(?:\.\d+)?)\s*mm\s+vorfuß/i);
  console.log('Pattern 2 (heel/forefoot):', germanReversePattern);

  const germanDropMatch = content.match(/sprengung[:\s]+(\d+(?:\.\d+)?)\s*mm/i);
  console.log('Drop pattern (Sprengung):', germanDropMatch);

  // Search for exact text from ground truth
  console.log('\n🎯 Searching for exact text from test...\n');
  const exactMatch = content.indexOf('28 mm Vorfuß / 38mm Ferse');
  console.log(`"28 mm Vorfuß / 38mm Ferse" found at: ${exactMatch}`);

  const exactMatch2 = content.indexOf('28 mm Vorfuss / 38mm Ferse');
  console.log(`"28 mm Vorfuss / 38mm Ferse" found at: ${exactMatch2}`);
}

checkContent().catch(console.error);
