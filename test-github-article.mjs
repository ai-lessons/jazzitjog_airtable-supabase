// Test extraction for one of the articles that failed in GitHub Actions
import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

async function testArticle() {
  try {
    // Test Article 279 (first one that failed)
    const records = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        filterByFormula: 'RECORD_ID() = "279"',
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      console.log('❌ Article 279 not found');
      return;
    }

    const record = records[0];
    console.log('Article 279:');
    console.log('- ID:', record.id);
    console.log('- Title:', record.get('Title') || 'N/A');
    console.log('- Content length:', (record.get('Content') || '').length);
    console.log('- Content preview:', (record.get('Content') || '').substring(0, 200));
    console.log('- Date:', record.get('Date'));
    console.log('- Source Link:', record.get('Source Link'));
  } catch (error) {
    console.error('Error:', error);
  }
}

testArticle();
