// Check actual Airtable field names
import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const records = await base(process.env.AIRTABLE_TABLE_NAME || 'Running Shoe Articles')
  .select({ maxRecords: 3 })
  .firstPage();

console.log('📋 Airtable Field Names:\n');

records.forEach((record, idx) => {
  console.log(`Record ${idx + 1} (${record.id}):`);
  console.log('Fields:', Object.keys(record.fields));
  console.log('Values:');
  for (const [key, value] of Object.entries(record.fields)) {
    const preview = typeof value === 'string' && value.length > 50
      ? value.slice(0, 50) + '...'
      : value;
    console.log(`  ${key}: ${JSON.stringify(preview)}`);
  }
  console.log('---\n');
});
