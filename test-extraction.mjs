import 'dotenv/config';
import { readFileSync } from 'fs';
import { extractFromArticle } from './src/etl/extract/index.js';

const content = readFileSync('article-rec3NyhJ7LDDdLNBv.txt', 'utf-8');
const title = 'The 10 Best Winter Running Shoes For Icy, Snowy, and Slushy Cold-Weather Runs';

console.log('Testing extraction for:', title);
console.log('Content length:', content.length);

const result = await extractFromArticle(
  {
    article_id: 274,
    record_id: 'rec3NyhJ7LDDdLNBv',
    title,
    content,
    date: '2025-10-07',
    source_link: 'https://www.runnersworld.com/gear/a20865467/best-winter-running-shoes/'
  },
  process.env.OPENAI_API_KEY
);

console.log('\n=== EXTRACTION RESULT ===');
console.log('Method:', result.extractionMethod);
console.log('Sneakers found:', result.sneakers.length);
console.log('Title analysis:', result.titleAnalysis);

if (result.sneakers.length > 0) {
  console.log('\nFirst sneaker:', JSON.stringify(result.sneakers[0], null, 2));
} else {
  console.log('\n❌ No sneakers extracted!');
}
