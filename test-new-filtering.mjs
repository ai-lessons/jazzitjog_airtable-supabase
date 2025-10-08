// Test new two-stage filtering logic
import 'dotenv/config';
import Airtable from 'airtable';
import { isRunningShoeArticle } from './dist/etl/extract/title_analysis.js';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

async function testFiltering() {
  try {
    console.log('Fetching recent articles to test filtering...\n');

    const records = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 10,
        sort: [{ field: 'Time created', direction: 'desc' }],
      })
      .firstPage();

    console.log(`Testing ${records.length} articles:\n`);

    for (const record of records) {
      const id = record.get('ID');
      const title = record.get('Title') || '';
      const content = record.get('Content') || '';

      const isShoeArticle = isRunningShoeArticle(title, content);
      const status = isShoeArticle ? '✅ ACCEPT' : '❌ REJECT';

      console.log(`${status} [ID ${id}]`);
      console.log(`   Title: ${title.substring(0, 70)}...`);
      console.log();
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFiltering();
