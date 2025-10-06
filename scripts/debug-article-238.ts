// Debug Article 238 specifically
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

async function debug() {
  console.log('🔍 Debugging Article 238\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });
  const article = ingestResult.articles.find(a => a.article_id === 238);

  if (!article) {
    console.error('❌ Article 238 not found');
    return;
  }

  console.log('📄 Article 238:');
  console.log(`   Title: ${article.title}`);
  console.log(`   Content length: ${article.content.length}\n`);

  // Extract
  console.log('🔬 Running extraction...\n');
  const extractResult = await extractFromArticle(
    {
      article_id: article.article_id,
      record_id: article.record_id,
      title: article.title,
      content: article.content,
      date: article.date,
      source_link: article.source_link,
    },
    process.env.OPENAI_API_KEY!
  );

  console.log('✅ Extraction completed:');
  console.log(`   Method: ${extractResult.extractionMethod}`);
  console.log(`   Title Analysis:`, extractResult.titleAnalysis);
  console.log(`   Sneakers found: ${extractResult.sneakers.length}\n`);

  if (extractResult.sneakers.length > 0) {
    extractResult.sneakers.forEach((sneaker, idx) => {
      console.log(`👟 [${idx + 1}] ${sneaker.brand_name} ${sneaker.model}`);
      console.log(`    primary_use: ${sneaker.primary_use || 'NULL'}`);
      console.log(`    weight: ${sneaker.weight || 'NULL'}g`);
      console.log(`    heel_height: ${sneaker.heel_height || 'NULL'}mm`);
      console.log(`    forefoot_height: ${sneaker.forefoot_height || 'NULL'}mm`);
      console.log(`    drop: ${sneaker.drop || 'NULL'}mm\n`);
    });
  } else {
    console.log('❌ No sneakers extracted!');
  }
}

debug().catch(console.error);
