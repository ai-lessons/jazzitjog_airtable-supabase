// Test Airtable connection and data structure
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';

async function testAirtable() {
  const client = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Table 1',
  });

  try {
    console.log('Testing Airtable connection...');
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('Table:', process.env.AIRTABLE_TABLE_NAME);

    const records = await client.fetchRecords({ maxRecords: 3 });

    console.log(`\n✅ Connected! Found ${records.length} records`);

    if (records.length > 0) {
      console.log('\nFirst record fields:');
      console.log(JSON.stringify(records[0].fields, null, 2));

      console.log('\nAvailable columns:');
      console.log(Object.keys(records[0].fields).sort().join('\n'));
    } else {
      console.log('\n⚠️ Table is empty');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testAirtable();
