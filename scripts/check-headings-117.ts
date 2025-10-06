// Check detected headings for Article 117
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { detectModelHeadings } from '../src/llm/extract_regex';

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

  console.log('📄 Article 117: Best Running Shoes for Beginners\n');

  const headings = detectModelHeadings(article.content);
  console.log(`Found ${headings.length} headings:\n`);

  headings.forEach((h, idx) => {
    console.log(`[${idx + 1}] "${h.brandModel}"`);
    console.log(`    Price: $${h.price || 'N/A'}`);
    console.log(`    Index: ${h.startIndex}-${h.endIndex}\n`);
  });
}

check().catch(console.error);
