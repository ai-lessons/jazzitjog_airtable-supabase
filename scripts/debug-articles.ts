// Debug problematic articles
import 'dotenv/config';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';
import { extractFromArticle } from '../src/etl/extract';

const ARTICLES_TO_DEBUG = [234, 238, 240];

async function debug() {
  console.log('🔍 Debugging problematic articles\n');

  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 100 });

  for (const articleId of ARTICLES_TO_DEBUG) {
    const article = ingestResult.articles.find(a => a.article_id === articleId);

    if (!article) {
      console.error(`❌ Article ${articleId} not found`);
      continue;
    }

    console.log('━'.repeat(80));
    console.log(`\n📄 Article ${articleId}:`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Content length: ${article.content.length}`);

    // Show first 500 chars of content for context
    console.log(`\n📝 Content preview:`);
    console.log(article.content.slice(0, 500) + '...\n');

    // Extract
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
        console.log(`    cushioning_type: ${sneaker.cushioning_type || 'NULL'}`);
        console.log(`    weight: ${sneaker.weight || 'NULL'}g`);
        console.log(`    foot_width: ${sneaker.foot_width || 'NULL'}`);
        console.log(`    heel_height: ${sneaker.heel_height || 'NULL'}mm`);
        console.log(`    forefoot_height: ${sneaker.forefoot_height || 'NULL'}mm`);
        console.log(`    drop: ${sneaker.drop || 'NULL'}mm`);
        console.log(`    waterproof: ${sneaker.waterproof}`);
        console.log('');
      });
    }

    console.log('');
  }
}

debug().catch(console.error);
