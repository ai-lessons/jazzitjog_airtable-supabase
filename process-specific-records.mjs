// Process specific Airtable records by ID
import 'dotenv/config';
import Airtable from 'airtable';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const AIRTABLE_IDS = ['41', '141']; // Records to process

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);
const table = base(process.env.AIRTABLE_TABLE_NAME || 'Table 1');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchRecordByIdField(idValue) {
  try {
    console.log(`\n📥 Searching for record with ID field = ${idValue}`);

    const records = await table
      .select({
        filterByFormula: `{ID} = ${idValue}`,
        maxRecords: 10, // In case there are multiple shoes from one article
      })
      .firstPage();

    if (records.length === 0) {
      console.log(`❌ No records found with ID: ${idValue}`);
      return null;
    }

    console.log(`✅ Found ${records.length} record(s)`);

    return records.map(record => ({
      record_id: record.id,
      article_id: record.fields['Article ID'],
      id_field: record.fields['ID'],
      title: record.fields['Title'],
      content: record.fields['Content'],
      date: record.fields['Date'],
      source_link: record.fields['Source Link'],
    }));
  } catch (error) {
    console.error(`❌ Failed to fetch ID ${idValue}:`, error.message);
    return null;
  }
}

async function extractSneakers(article) {
  console.log(`\n⚙️  Extracting sneakers from: ${article.title || 'Untitled'}`);

  const content = article.content?.substring(0, 8000) || '';
  if (!content) {
    console.log('   ⚠️  No content available');
    return [];
  }

  const prompt = `Extract running shoe information from this article.

Title: ${article.title || 'Untitled'}

Content:
${content}

Return a JSON array of shoes with this structure:
{
  "sneakers": [
    {
      "brand_name": "Nike",
      "model": "Pegasus 40",
      "primary_use": "road running",
      "surface_type": "road",
      "heel_height": 32,
      "forefoot_height": 22,
      "drop": 10,
      "weight": 280,
      "price": 130,
      "carbon_plate": false,
      "waterproof": false,
      "cushioning_type": "balanced",
      "foot_width": "standard",
      "upper_breathability": "high",
      "additional_features": "React foam, mesh upper"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content.trim();
    const json = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    console.log(`✅ Extracted ${json.sneakers.length} sneakers`);
    return json.sneakers;
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    return [];
  }
}

async function insertToStaging(sneakers, airtableId, article) {
  console.log(`\n💾 Inserting ${sneakers.length} sneakers to staging_table`);

  const stagingItems = sneakers.map(sneaker => ({
    airtable_id: airtableId,
    brand_name: sneaker.brand_name,
    model: sneaker.model,
    primary_use: sneaker.primary_use,
    surface_type: sneaker.surface_type,
    heel_height: sneaker.heel_height,
    forefoot_height: sneaker.forefoot_height,
    drop: sneaker.drop,
    weight: sneaker.weight,
    price: sneaker.price,
    carbon_plate: sneaker.carbon_plate,
    waterproof: sneaker.waterproof,
    cushioning_type: sneaker.cushioning_type,
    foot_width: sneaker.foot_width,
    upper_breathability: sneaker.upper_breathability,
    additional_features: sneaker.additional_features,
    date: article.date,
    source_link: article.source_link,
    is_running_shoe: true,
    is_edited: false,
  }));

  const { data, error } = await supabase
    .from('staging_table')
    .insert(stagingItems)
    .select();

  if (error) {
    console.error('❌ Insert failed:', error);
    return { success: false, error };
  }

  console.log(`✅ Inserted ${data.length} items successfully`);
  return { success: true, inserted: data.length };
}

async function processRecordByIdField(idValue) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing Records with ID = ${idValue}`);
  console.log('='.repeat(70));

  // 1. Fetch from Airtable
  const articles = await fetchRecordByIdField(idValue);
  if (!articles || articles.length === 0) {
    console.log(`⏭️  Skipping ID ${idValue}`);
    return;
  }

  // Process each article/record found
  for (const article of articles) {
    console.log(`\n📄 Processing: ${article.title || 'Untitled'}`);
    console.log(`   Airtable Record ID: ${article.record_id}`);
    console.log(`   Article ID: ${article.article_id}`);
    console.log(`   🔗 Source: ${article.source_link}`);

    // 2. Check if already in staging or production
    const { data: inStaging } = await supabase
      .from('staging_table')
      .select('id, brand_name, model')
      .eq('airtable_id', article.record_id);

    if (inStaging && inStaging.length > 0) {
      console.log(`   ⚠️  Already in staging_table (${inStaging.length} items):`);
      inStaging.forEach(item => {
        console.log(`      - ${item.brand_name} ${item.model}`);
      });
      continue;
    }

    const { data: inProduction } = await supabase
      .from('shoe_results')
      .select('id, brand_name, model')
      .eq('record_id', article.record_id);

    if (inProduction && inProduction.length > 0) {
      console.log(`   ⚠️  Already in shoe_results (${inProduction.length} items):`);
      inProduction.forEach(item => {
        console.log(`      - ${item.brand_name} ${item.model}`);
      });
      continue;
    }

    // 3. Extract sneakers using OpenAI
    const sneakers = await extractSneakers(article);

    if (sneakers.length === 0) {
      console.log('   ⚠️  No sneakers extracted');
      continue;
    }

    // 4. Insert to staging
    await insertToStaging(sneakers, article.record_id, article);
  }
}

async function main() {
  console.log('🚀 Processing Airtable records by ID field...\n');
  console.log(`IDs to process: ${AIRTABLE_IDS.join(', ')}\n`);

  for (const idValue of AIRTABLE_IDS) {
    await processRecordByIdField(idValue);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All records processed!');
  console.log('='.repeat(70));
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
