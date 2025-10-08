// Test extraction for a single Airtable record
require('dotenv').config();
const Airtable = require('airtable');

const RECORD_ID = 'rec3NyhJ7LDDdLNBv'; // Change this to test different records

async function testSingleArticle() {
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
  }).base(process.env.AIRTABLE_BASE_ID);

  try {
    console.log('Fetching record:', RECORD_ID);
    const record = await base(process.env.AIRTABLE_TABLE_NAME || 'Running Shoe Articles').find(RECORD_ID);

    console.log('\n=== RECORD DETAILS ===');
    console.log('ID:', record.id);
    console.log('Title:', record.get('Title'));
    console.log('Article ID:', record.get('ID'));
    console.log('Date:', record.get('Created'));
    console.log('Source:', record.get('Article link'));

    const content = record.get('Content');
    console.log('\n=== CONTENT ===');
    console.log('Length:', content?.length || 0);
    console.log('First 500 chars:', content?.substring(0, 500));
    console.log('Last 500 chars:', content?.substring(content.length - 500));

    // Check for shoe-related keywords
    const keywords = ['nike', 'adidas', 'asics', 'brooks', 'hoka', 'shoe', 'sneaker', 'running', 'drop', 'weight', 'mm', 'grams', 'oz', 'heel', 'forefoot', 'cushion', 'carbon'];
    console.log('\n=== KEYWORD CHECK ===');
    keywords.forEach(kw => {
      const count = (content?.toLowerCase().match(new RegExp(kw, 'g')) || []).length;
      if (count > 0) console.log(`${kw}: ${count}`);
    });

    // Save content to file for manual review
    const fs = require('fs');
    fs.writeFileSync(`article-${RECORD_ID}.txt`, content || 'NO CONTENT');
    console.log(`\n✅ Full content saved to: article-${RECORD_ID}.txt`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSingleArticle();
