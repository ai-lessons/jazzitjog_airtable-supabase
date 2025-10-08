// Test LLM extraction for Article 274
import 'dotenv/config';
import Airtable from 'airtable';
import { extractWithLLM } from './src/llm/extract_llm';
import { analyzeTitleForContext } from './src/etl/extract/title_analysis';

async function main() {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! })
    .base(process.env.AIRTABLE_BASE_ID!);

  console.log('🔍 Testing LLM extraction for Article 274...\n');

  // Get article from Airtable
  const records = await base(process.env.AIRTABLE_TABLE_NAME!)
    .select({
      maxRecords: 1,
      filterByFormula: '{ID} = 274'
    })
    .firstPage();

if (records.length === 0) {
  console.error('❌ Article 274 not found');
  process.exit(1);
}

const record = records[0];
const title = record.fields.Title as string;
const content = record.fields.Content as string;

console.log('📄 Article:');
console.log('  Title:', title);
console.log('  Content length:', content.length);

// Analyze title
console.log('\n1️⃣ Title Analysis:');
const titleAnalysis = analyzeTitleForContext(title);
console.log(JSON.stringify(titleAnalysis, null, 2));

// Run LLM extraction
console.log('\n2️⃣ Running LLM extraction...');
const results = await extractWithLLM(
  process.env.OPENAI_API_KEY!,
  content,
  title,
  { titleAnalysis }
);

console.log(`\n3️⃣ Results: ${results.length} shoes extracted`);
results.forEach((shoe, idx) => {
  console.log(`\n${idx + 1}. ${shoe.brand_name} ${shoe.model}`);
  console.log(`   - Weight: ${shoe.weight}g`);
  console.log(`   - Drop: ${shoe.drop}mm`);
  console.log(`   - Price: ${shoe.price_usd ? '$' + shoe.price_usd : 'N/A'}`);
  console.log(`   - Waterproof: ${shoe.waterproof}`);
  console.log(`   - Surface: ${shoe.surface_type}`);
});

console.log('\n💡 Expected: ~10 winter running shoes');
console.log(`✅ Extracted: ${results.length} shoes`);
}

main().catch(console.error);
