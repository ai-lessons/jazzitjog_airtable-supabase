import 'dotenv/config';
import { readFileSync } from 'fs';
import { extractFromArticle } from './src/etl/extract/orchestrator';
import { normalizeSneakers } from './src/etl/normalize';
import { buildShoeInputs } from './src/etl/build';

(async () => {
  const content = readFileSync('article-rec3NyhJ7LDDdLNBv.txt', 'utf-8');
  const title = 'The 10 Best Winter Running Shoes For Icy, Snowy, and Slushy Cold-Weather Runs';
  
  const extractResult = await extractFromArticle(
    {
      article_id: 274,
      record_id: 'rec3NyhJ7LDDdLNBv',
      title,
      content,
      date: '2025-10-07',
      source_link: 'https://www.runnersworld.com/gear/a20865467/best-winter-running-shoes/',
    },
    process.env.OPENAI_API_KEY!
  );
  
  console.log('=== STEP 1: EXTRACTION ===');
  console.log('Method:', extractResult.extractionMethod);
  console.log('Sneakers extracted:', extractResult.sneakers.length);
  
  if (extractResult.sneakers.length > 0) {
    console.log('First sneaker:', extractResult.sneakers[0].brand_name, extractResult.sneakers[0].model);
  }
  
  const normalized = normalizeSneakers(extractResult.sneakers, extractResult.titleAnalysis);
  console.log('\n=== STEP 2: NORMALIZATION ===');
  console.log('After normalization:', normalized.length);
  
  if (normalized.length > 0) {
    console.log('First normalized:', normalized[0].sneaker.brand_name, normalized[0].sneaker.model);
  }
  
  const built = buildShoeInputs(normalized.map(r => r.sneaker), {
    article_id: 274,
    record_id: 'rec3NyhJ7LDDdLNBv',
    date: '2025-10-07',
    source_link: 'https://www.runnersworld.com/gear/a20865467/best-winter-running-shoes/',
  });
  
  console.log('\n=== STEP 3: BUILD ===');
  console.log('Built:', built.length);
  
  console.log('\n=== FINAL RESULTS ===');
  built.slice(0, 5).forEach((r, index) => {
    console.log(`${index + 1}. ${r.shoe.brand_name} ${r.shoe.model}`);
    console.log(`   Weight: ${r.shoe.weight}g, Drop: ${r.shoe.drop}mm, Price: ${r.shoe.price}`);
  });
})();
