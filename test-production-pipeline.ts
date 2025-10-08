import 'dotenv/config';
import { AirtableClient } from './src/integrations/airtable';
import { extractFromArticle } from './src/etl/extract/orchestrator';
import { normalizeSneakers } from './src/etl/normalize';
import { buildShoeInputs } from './src/etl/build';

const ARTICLE_ID = 274;
const RECORD_ID = 'rec3NyhJ7LDDdLNBv';

(async () => {
  console.log('=== TESTING PRODUCTION PIPELINE FOR ARTICLE 274 ===\n');
  
  const airtable = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Running Shoe Articles',
  });
  
  const records = await airtable.fetchRecords({ maxRecords: 300 });
  const article = records.find(r => r.fields['ID'] === ARTICLE_ID);
  
  if (!article) {
    console.error('Article 274 not found!');
    process.exit(1);
  }
  
  console.log('Article found:', article.fields['Title']);
  
  console.log('\n--- EXTRACTION ---');
  const extractResult = await extractFromArticle(
    {
      article_id: ARTICLE_ID,
      record_id: RECORD_ID,
      title: article.fields['Title'] as string,
      content: article.fields['Content'] as string,
      date: article.fields['Created'] as string,
      source_link: article.fields['Article link'] as string,
    },
    process.env.OPENAI_API_KEY!
  );
  
  console.log('Method:', extractResult.extractionMethod);
  console.log('Sneakers extracted:', extractResult.sneakers.length);
  
  if (extractResult.sneakers.length === 0) {
    console.log('\n❌ No sneakers extracted');
    process.exit(0);
  }
  
  console.log('\n--- NORMALIZATION ---');
  const normalizeResults = normalizeSneakers(
    extractResult.sneakers,
    extractResult.titleAnalysis
  );
  
  console.log('After normalization:', normalizeResults.length);
  
  if (normalizeResults.length === 0) {
    console.log('\n❌ All filtered out');
    process.exit(0);
  }
  
  console.log('\n--- BUILD ---');
  const buildResults = buildShoeInputs(
    normalizeResults.map(r => r.sneaker),
    {
      article_id: ARTICLE_ID,
      record_id: RECORD_ID,
      date: article.fields['Created'] as string,
      source_link: article.fields['Article link'] as string,
    }
  );
  
  console.log('Built shoe inputs:', buildResults.length);
  
  console.log('\n--- FINAL RESULTS (first 3) ---');
  buildResults.slice(0, 3).forEach((result, idx) => {
    const shoe = result.shoe;
    console.log(`\nShoe ${idx + 1}: ${shoe.brand_name} ${shoe.model}`);
    console.log(`   Weight: ${shoe.weight}g, Drop: ${shoe.drop}mm, Price: $${shoe.price}`);
    console.log(`   Use: ${shoe.primary_use}, Surface: ${shoe.surface_type}`);
    console.log(`   Warnings: ${result.warnings.join(', ') || 'none'}`);
  });
  
  console.log(`\n✅ Would insert ${buildResults.length} shoes into shoe_results`);
})();
