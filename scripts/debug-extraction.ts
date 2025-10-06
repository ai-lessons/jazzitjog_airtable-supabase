// Debug extraction issue
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { analyzeTitleForContext, matchesTitleAnalysis } from '../src/etl/extract/title_analysis';

async function debug() {
  console.log('🔍 Debugging extraction issue\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, {
    maxRecords: 1,
  });

  const article = ingestResult.articles[0];

  console.log('📄 Article:');
  console.log('   Title:', article.title);
  console.log('   ID:', article.article_id);
  console.log('\n');

  // Analyze title
  const titleAnalysis = analyzeTitleForContext(article.title);

  console.log('📊 Title Analysis:');
  console.log('   Scenario:', titleAnalysis.scenario);
  console.log('   Brand:', titleAnalysis.brand);
  console.log('   Model:', titleAnalysis.model);
  console.log('   Confidence:', titleAnalysis.confidence);
  console.log('\n');

  // Test filter with extracted sneakers
  const testSneakers = [
    { brand_name: 'Adidas', model: 'Ultraboost 5X' },
    { brand_name: 'On', model: 'tempo' },
  ];

  console.log('🧪 Testing filter with extracted sneakers:\n');

  testSneakers.forEach((sneaker, idx) => {
    const matches = matchesTitleAnalysis(sneaker, titleAnalysis);
    const icon = matches ? '✅' : '❌';

    console.log(`[${idx + 1}] ${icon} ${sneaker.brand_name} ${sneaker.model}`);
    console.log(`      Should be kept: ${matches}`);
  });

  console.log('\n');
  console.log('🎯 Expected behavior:');
  console.log('   For brand-only="Adidas" article:');
  console.log('   - Adidas sneakers → KEEP');
  console.log('   - Other brands → REJECT');
}

debug().catch(console.error);
