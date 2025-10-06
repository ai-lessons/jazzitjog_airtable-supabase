// Check records from latest run
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('📊 Checking latest pipeline run\n');

  // Get records created in last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('shoe_results')
    .select('*')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data.length} records from latest run\n`);
  console.log('━'.repeat(80));

  // Group by article
  const byArticle = new Map<string, any[]>();
  data.forEach(record => {
    const artId = record.article_id;
    if (!byArticle.has(artId)) {
      byArticle.set(artId, []);
    }
    byArticle.get(artId)!.push(record);
  });

  console.log(`\n📦 Articles processed: ${byArticle.size}\n`);

  byArticle.forEach((shoes, articleId) => {
    console.log(`📄 Article ${articleId} (${shoes[0].record_id}):`);
    console.log(`   Shoes: ${shoes.length}`);
    console.log(`   Brands: ${[...new Set(shoes.map(s => s.brand_name))].join(', ')}`);
    console.log('');

    shoes.forEach((shoe, idx) => {
      console.log(`   [${idx + 1}] ${shoe.brand_name} ${shoe.model}`);
      console.log(`       Weight: ${shoe.weight || 'null'}g, Drop: ${shoe.drop || 'null'}mm, Price: $${shoe.price || 'null'}`);
    });
    console.log('');
  });
}

check().catch(console.error);
