// Test regex patterns directly on content
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function test() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 1 });
  const article = ingestResult.articles[0];

  console.log('📄 Testing regex patterns on article\n');
  console.log('   Title:', article.title);
  console.log('   Length:', article.content.length, 'chars\n');

  // Test Pattern 1: Brand + Name + Number
  console.log('1️⃣ Pattern: Adidas + Name + Number (e.g., "Adidas Ultraboost 5X")\n');
  const pattern1 = /\bAdidas\s+(Air\s+Zoom\s+|Gel-?|Fresh\s+Foam\s+)?([A-Z][a-z]+)\s*(\d+[a-z]*)/gi;
  const matches1 = Array.from(article.content.matchAll(pattern1));
  console.log(`   Found ${matches1.length} matches:`);
  matches1.forEach((m, idx) => {
    console.log(`   [${idx + 1}] ${m[0]}`);
  });

  console.log('\n');

  // Test Pattern 2: Brand + Known Series
  console.log('2️⃣ Pattern: Adidas + Known Series (Ultraboost, Supernova, etc.)\n');
  const pattern2 = /\bAdidas\s+(Ultraboost|Supernova|Takumi\s+Sen|Adios\s+Pro|Adizero|Duramo\s+SL|Pro\s+Evo|Boston|Solarboost|Alphaboost|Pureboost|Response|Galaxy|Duramo)\b/gi;
  const matches2 = Array.from(article.content.matchAll(pattern2));
  console.log(`   Found ${matches2.length} matches:`);
  matches2.forEach((m, idx) => {
    console.log(`   [${idx + 1}] ${m[0]}`);
  });

  console.log('\n');

  // Combined unique matches
  const allMatches = new Set([
    ...matches1.map(m => m[0].trim()),
    ...matches2.map(m => m[0].trim())
  ]);

  console.log(`✅ Total unique Adidas models found: ${allMatches.size}\n`);
  Array.from(allMatches).forEach((match, idx) => {
    console.log(`   [${idx + 1}] ${match}`);
  });
}

test().catch(console.error);
