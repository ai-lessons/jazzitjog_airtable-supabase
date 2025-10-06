// Check Article 117 extraction
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AirtableClient } from '../src/integrations/airtable';
import { ingestFromAirtable } from '../src/etl/ingest';

async function check() {
  // Check database
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbData, error } = await supabase
    .from('shoe_results')
    .select('*')
    .eq('article_id', '117')
    .order('brand_name', { ascending: true });

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log(`📊 Article 117 in database: ${dbData?.length || 0} sneakers\n`);

  if (dbData && dbData.length > 0) {
    dbData.forEach((shoe, idx) => {
      console.log(`[${idx + 1}] ${shoe.brand_name} ${shoe.model}`);
      console.log(`    weight: ${shoe.weight}g, heel: ${shoe.heel_height}mm, drop: ${shoe.drop}mm`);
      console.log(`    carbon_plate: ${shoe.carbon_plate}\n`);
    });
  }

  // Check article title
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const ingestResult = await ingestFromAirtable(airtableClient, { maxRecords: 200 });
  const article = ingestResult.articles.find(a => a.article_id === 117);

  if (article) {
    console.log(`📄 Article 117 Title: ${article.title}`);
    console.log(`📝 Content preview (first 500 chars):`);
    console.log(article.content.slice(0, 500));
  }
}

check().catch(console.error);
