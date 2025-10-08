// Check what fields exist in Airtable and find article 279
import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

async function checkArticles() {
  try {
    console.log('Fetching first 5 records to see structure...\n');

    const records = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 5,
        sort: [{ field: 'Time created', direction: 'desc' }]
      })
      .firstPage();

    records.forEach((record, idx) => {
      console.log(`\n=== Record ${idx + 1} ===`);
      console.log('Airtable ID:', record.id);
      console.log('Fields:', Object.keys(record.fields));
      console.log('ID field:', record.get('ID'));
      console.log('Title:', record.get('Title')?.substring(0, 60));
      console.log('Content length:', (record.get('Content') || '').length);
    });

    // Try to find any record with article_id 279
    console.log('\n\n=== Looking for article_id 279 ===');
    const allRecords = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 300,
      })
      .firstPage();

    const article279 = allRecords.find(r => r.get('ID') === 279 || r.get('ID') === '279');

    if (article279) {
      console.log('✅ Found article 279!');
      console.log('Airtable ID:', article279.id);
      console.log('Title:', article279.get('Title'));
      console.log('Content length:', (article279.get('Content') || '').length);
      console.log('Content preview:', (article279.get('Content') || '').substring(0, 300));
    } else {
      console.log('❌ Article with ID=279 not found in first 300 records');
      console.log('\nID values found:', allRecords.map(r => r.get('ID')).filter(Boolean).slice(0, 20));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkArticles();
