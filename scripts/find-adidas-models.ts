// Find all Adidas model mentions in article
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function find() {
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 1 });
  const article = ingestResult.articles[0];

  console.log('📄 Article:', article.title);
  console.log('━'.repeat(80));
  console.log('\n🔍 Searching for Adidas model patterns:\n');

  // Known Adidas running shoe models
  const knownModels = [
    'Ultraboost', 'Adizero', 'Supernova', 'Solar', 'Duramo', 'Response',
    'Boston', 'Takumi', 'Pro Evo', 'Adios', 'SL', 'Prime', 'Solarboost',
    'Alphaboost', 'Pureboost', 'Edge', 'Galaxy'
  ];

  const foundModels = new Map<string, string[]>();

  // Search for each known model
  knownModels.forEach(model => {
    const pattern = new RegExp(`(adidas\\s+)?(${model}[^.!?\\n]{0,50})`, 'gi');
    const matches = Array.from(article.content.matchAll(pattern));

    if (matches.length > 0) {
      const contexts = matches.map(m => m[0].trim());
      foundModels.set(model, contexts);
    }
  });

  console.log(`✅ Found ${foundModels.size} different model names:\n`);

  foundModels.forEach((contexts, model) => {
    console.log(`📦 ${model}:`);
    contexts.forEach((context, idx) => {
      console.log(`   [${idx + 1}] ${context}`);
    });
    console.log('');
  });

  // Also search for specific heading patterns
  console.log('\n🎯 Searching for structured headings:\n');

  const lines = article.content.split('\n');
  const potentialHeadings: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();

    // Look for headings that might contain model names
    if (trimmed.length > 10 && trimmed.length < 200) {
      // Check if line looks like a heading
      if (/^(Best|Top|#\d|Winner|Runner.*Up|Pick|Choice).*:|Adidas\s+[A-Z]/i.test(trimmed)) {
        potentialHeadings.push(trimmed);
      }
    }
  });

  if (potentialHeadings.length > 0) {
    console.log(`Found ${potentialHeadings.length} potential heading lines:\n`);
    potentialHeadings.forEach((heading, idx) => {
      console.log(`[${idx + 1}] ${heading}`);
    });
  } else {
    console.log('❌ No structured headings found');
  }

  console.log('\n');
  console.log('💡 Article appears to be:', foundModels.size >= 6 ? 'STRUCTURED (6+ models)' : 'UNSTRUCTURED (<6 models)');
}

find().catch(console.error);
