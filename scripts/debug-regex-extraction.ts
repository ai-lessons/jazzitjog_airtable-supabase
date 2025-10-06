// Debug regex extraction to see what's found
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { detectModelHeadings, detectUnstructuredModels, extractSpecs } from '../src/llm/extract_regex';

async function debug() {
  console.log('🔍 Debugging regex extraction\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 1 });
  const article = ingestResult.articles[0];

  console.log('📄 Article:', article.title);
  console.log('   Content length:', article.content.length, 'chars\n');

  // Try structured headings
  console.log('1️⃣ Testing detectModelHeadings (structured):\n');
  const headings = detectModelHeadings(article.content);
  console.log(`   Found ${headings.length} structured headings:`);
  headings.forEach((h, idx) => {
    console.log(`   [${idx + 1}] ${h.brandModel}`);
    console.log(`       Price: $${h.price || 'N/A'}`);
  });

  console.log('\n');

  // Try unstructured detection
  console.log('2️⃣ Testing detectUnstructuredModels (unstructured):\n');
  const unstructured = detectUnstructuredModels(article.content);
  console.log(`   Found ${unstructured.length} unstructured models:`);
  unstructured.forEach((m, idx) => {
    console.log(`   [${idx + 1}] ${m.brandModel}`);
    console.log(`       Price: $${m.price || 'N/A'}`);
  });

  console.log('\n');

  // Show which method is being used
  const methodUsed = headings.length > 0 ? 'structured' : 'unstructured';
  console.log(`✅ Using ${methodUsed} detection (${methodUsed === 'structured' ? headings.length : unstructured.length} models)\n`);

  // Show what titles/headings exist in content
  console.log('3️⃣ Searching for "Best" or "Adidas" patterns:\n');
  const lines = article.content.split('\n');
  let foundCount = 0;
  lines.forEach((line, idx) => {
    if (/best|adidas\s+\w+\s+\d+/i.test(line) && line.length < 150) {
      foundCount++;
      console.log(`   Line ${idx}: ${line.trim()}`);
    }
  });
  console.log(`\n   Found ${foundCount} potential heading lines\n`);
}

debug().catch(console.error);
