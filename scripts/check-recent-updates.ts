// Check recently updated records
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('📊 Checking recently updated records\n');

  // Get records updated in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('shoe_results')
    .select('*')
    .or(`created_at.gte.${tenMinutesAgo},updated_at.gte.${tenMinutesAgo}`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data.length} recently touched records\n`);

  // Group by article
  const byArticle = new Map<string, any[]>();
  data.forEach(record => {
    const artId = record.article_id;
    if (!byArticle.has(artId)) {
      byArticle.set(artId, []);
    }
    byArticle.get(artId)!.push(record);
  });

  console.log(`📦 Articles: ${byArticle.size}\n`);
  console.log('━'.repeat(80));

  byArticle.forEach((shoes, articleId) => {
    const isNew = shoes.some(s => new Date(s.created_at) > new Date(tenMinutesAgo));
    const icon = isNew ? '🆕' : '♻️ ';

    console.log(`\n${icon} Article ${articleId}:`);
    console.log(`   Record ID: ${shoes[0].record_id}`);
    console.log(`   Shoes: ${shoes.length}`);
    console.log(`   Brands: ${[...new Set(shoes.map(s => s.brand_name))].join(', ')}`);
    console.log('');

    shoes.forEach((shoe, idx) => {
      const isNewShoe = new Date(shoe.created_at) > new Date(tenMinutesAgo);
      const status = isNewShoe ? '🆕 NEW' : '♻️  UPD';

      console.log(`   [${idx + 1}] ${status} ${shoe.brand_name} ${shoe.model}`);
      console.log(`       model_key: ${shoe.model_key}`);
      console.log(`       Weight: ${shoe.weight || '-'}g, Drop: ${shoe.drop || '-'}mm, Price: $${shoe.price || '-'}`);
      console.log(`       Created: ${new Date(shoe.created_at).toLocaleTimeString()}`);
    });
  });

  console.log('\n' + '━'.repeat(80));

  // Count new vs updated
  const newRecords = data.filter(r => new Date(r.created_at) > new Date(tenMinutesAgo)).length;
  const updatedRecords = data.length - newRecords;

  console.log(`\n📊 Summary:`);
  console.log(`   🆕 New records: ${newRecords}`);
  console.log(`   ♻️  Updated records: ${updatedRecords}`);
  console.log(`   📦 Total: ${data.length}`);
}

check().catch(console.error);
