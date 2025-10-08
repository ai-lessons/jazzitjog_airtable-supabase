// Debug why Article 270 is rejected
import 'dotenv/config';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

async function debugArticle() {
  try {
    const records = await base(process.env.AIRTABLE_TABLE_NAME)
      .select({
        filterByFormula: '{ID} = 270',
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      console.log('❌ Article 270 not found');
      return;
    }

    const record = records[0];
    const title = record.get('Title') || '';
    const content = record.get('Content') || '';

    console.log('Article 270:');
    console.log('Title:', title);
    console.log('\nTitle includes "review":', title.toLowerCase().includes('review'));
    console.log('Title includes "shoe":', title.toLowerCase().includes('shoe'));
    console.log('\nContent length:', content.length);
    console.log('Content preview (first 500 chars):');
    console.log(content.substring(0, 500));

    // Check for shoe characteristics
    const checks = [
      { pattern: /\d+\s*mm\s+drop/i, name: 'drop in mm' },
      { pattern: /stack\s+height/i, name: 'stack height' },
      { pattern: /heel\s+height/i, name: 'heel height' },
      { pattern: /\d+\s*oz/i, name: 'weight in oz' },
      { pattern: /\d+\s*g(?:rams)?/i, name: 'weight in grams' },
      { pattern: /cushion/i, name: 'cushion' },
      { pattern: /midsole/i, name: 'midsole' },
      { pattern: /outsole/i, name: 'outsole' },
    ];

    console.log('\nCharacteristics found in content:');
    checks.forEach(({ pattern, name }) => {
      const found = pattern.test(content);
      console.log(`  ${found ? '✅' : '❌'} ${name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugArticle();
