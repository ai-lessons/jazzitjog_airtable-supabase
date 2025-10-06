import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkLatestSync() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Checking what was actually synced in latest run...\n');

  // Get all records and sort by article_id
  const { data: allRecords, error } = await supabase
    .from('shoe_results')
    .select('article_id, brand_name, model, created_at')
    .order('article_id', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 Total records in database: ${allRecords.length}`);

  // Get unique article IDs and their ranges
  const articleIds = [...new Set(allRecords.map(r => r.article_id))].sort((a, b) => a - b);

  console.log(`📝 Article ID range: ${Math.min(...articleIds)} - ${Math.max(...articleIds)}`);
  console.log(`📈 Unique articles: ${articleIds.length}`);

  // Check specifically for Adidas records
  const adidasRecords = allRecords.filter(r =>
    r.brand_name.toLowerCase().includes('adidas')
  );

  console.log(`\n👟 Adidas records: ${adidasRecords.length}`);
  console.log('Adidas records by article:');

  const adidasByArticle = {};
  adidasRecords.forEach(record => {
    if (!adidasByArticle[record.article_id]) {
      adidasByArticle[record.article_id] = [];
    }
    adidasByArticle[record.article_id].push(`${record.brand_name} ${record.model}`);
  });

  Object.keys(adidasByArticle).sort((a, b) => Number(a) - Number(b)).forEach(articleId => {
    console.log(`  Article ${articleId}: ${adidasByArticle[articleId].join(', ')}`);
  });

  // Check if these are old or new records by looking at creation date
  console.log('\n📅 Adidas records by creation time:');
  adidasRecords.forEach(record => {
    console.log(`  Article ${record.article_id}: ${record.brand_name} ${record.model} - Created: ${record.created_at}`);
  });

  // Check what articles were in our sync range (we processed 16-255)
  const syncRangeArticles = articleIds.filter(id => id >= 16 && id <= 255);
  const oldArticles = articleIds.filter(id => id < 16 || id > 255);

  console.log(`\n🔄 Articles in our sync range (16-255): ${syncRangeArticles.length}`);
  console.log(`🗂️  Articles outside sync range: ${oldArticles.length}`);

  if (oldArticles.length > 0) {
    console.log(`   Old articles: ${oldArticles.slice(0, 10).join(', ')}${oldArticles.length > 10 ? '...' : ''}`);
  }

  // Check if any Adidas records are from our sync range
  const adidasInSyncRange = Object.keys(adidasByArticle).filter(id => {
    const articleId = Number(id);
    return articleId >= 16 && articleId <= 255;
  });

  console.log(`\n🎯 Adidas records from our sync range (16-255): ${adidasInSyncRange.length}`);
  if (adidasInSyncRange.length > 0) {
    console.log('🚨 PROBLEM: New sync still creating Adidas records!');
    adidasInSyncRange.forEach(articleId => {
      console.log(`   Article ${articleId}: ${adidasByArticle[articleId].join(', ')}`);
    });
  } else {
    console.log('✅ SUCCESS: No new Adidas records from latest sync!');
    console.log('💡 All Adidas records are from old data (articles < 16)');
  }
}

checkLatestSync().catch(console.error);