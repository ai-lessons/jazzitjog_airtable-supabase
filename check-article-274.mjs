// Check Article 274 content
import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

console.log('🔍 Looking for Article 274...\n');

const records = await base(process.env.AIRTABLE_TABLE_NAME)
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
console.log('📄 Article 274 Found:');
console.log('  Airtable ID:', record.id);
console.log('  Title:', record.fields.Title);
console.log('  Has Content:', !!record.fields.Content);
console.log('  Content length:', record.fields.Content?.length || 0);
console.log('  Date:', record.fields.Created || record.fields.Date);
console.log('  Link:', record.fields['Article link']);

console.log('\n📝 Content Preview (first 500 chars):');
console.log(record.fields.Content?.slice(0, 500));

console.log('\n🔍 Searching for shoe mentions in content...');
const content = record.fields.Content || '';
const shoePatterns = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+\d+)?/g, // Brand Model patterns
  /\b(?:Nike|Adidas|Asics|Brooks|Hoka|New Balance|Saucony|Mizuno|Puma|Under Armour)[^\n.]{0,50}/gi,
];

const matches = new Set();
shoePatterns.forEach(pattern => {
  const found = content.match(pattern);
  if (found) {
    found.forEach(m => matches.add(m.trim()));
  }
});

console.log(`\nFound ${matches.size} potential shoe mentions:`);
[...matches].slice(0, 20).forEach(m => console.log(`  - ${m}`));
