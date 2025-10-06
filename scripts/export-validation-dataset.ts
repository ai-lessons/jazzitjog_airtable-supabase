// Export validation dataset to CSV for manual review
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ValidationRow {
  article_id: string;
  article_title: string;
  brand_name: string;
  model: string;
  model_key: string;

  // Critical fields
  primary_use: string | null;
  cushioning_type: string | null;
  weight: number | null;
  foot_width: string | null;
  heel_height: number | null;
  drop: number | null;
  waterproof: boolean | null;

  // Additional context
  price: number | null;
  forefoot_height: number | null;
  carbon_plate: boolean | null;
  surface_type: string | null;
}

async function exportValidationDataset() {
  console.log('📊 Exporting validation dataset\n');

  // Use fixed set of article IDs from ground truth
  const articleIds = [234, 237, 238, 240, 245, 246, 249, 250, 252, 254, 255, 257, 258];

  console.log(`✅ Selected ${articleIds.length} articles for validation\n`);

  // Fetch all data for these articles
  const { data: shoes, error: shoesError } = await client
    .from('shoe_results')
    .select('*')
    .in('article_id', articleIds)
    .order('article_id', { ascending: true });

  if (shoesError) {
    console.error('❌ Error fetching shoes:', shoesError);
    return;
  }

  console.log(`✅ Found ${shoes?.length} shoes across ${articleIds.length} articles\n`);

  // Get article titles from Airtable
  const { AirtableClient } = await import('../src/integrations/airtable');
  const airtableClient = new AirtableClient({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
  });

  const records = await airtableClient.fetchRecords({ maxRecords: 100 });
  const titleMap = new Map(
    records.map(r => [
      String(r.fields['ID'] || r.fields['Id'] || r.fields['id']),
      String(r.fields['Title'] || r.fields['title'] || ''),
    ])
  );

  // Prepare CSV data
  const validationData: ValidationRow[] = (shoes || []).map(shoe => ({
    article_id: shoe.article_id,
    article_title: titleMap.get(String(shoe.article_id)) || 'Unknown',
    brand_name: shoe.brand_name,
    model: shoe.model,
    model_key: shoe.model_key,

    // Critical fields
    primary_use: shoe.primary_use,
    cushioning_type: shoe.cushioning_type,
    weight: shoe.weight,
    foot_width: shoe.foot_width,
    heel_height: shoe.heel_height,
    drop: shoe.drop,
    waterproof: shoe.waterproof,

    // Additional context
    price: shoe.price,
    forefoot_height: shoe.forefoot_height,
    carbon_plate: shoe.carbon_plate,
    surface_type: shoe.surface_type,
  }));

  // Generate CSV
  const headers = [
    'article_id',
    'article_title',
    'brand_name',
    'model',
    'model_key',
    'primary_use',
    'cushioning_type',
    'weight',
    'foot_width',
    'heel_height',
    'drop',
    'waterproof',
    'price',
    'forefoot_height',
    'carbon_plate',
    'surface_type',
  ];

  const csvRows = [
    headers.join(','),
    ...validationData.map(row =>
      headers.map(header => {
        const value = row[header as keyof ValidationRow];
        // Handle nulls and escape commas/quotes
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `validation-dataset-${timestamp}.csv`;

  writeFileSync(filename, csvContent, 'utf-8');

  console.log(`✅ Validation dataset exported to: ${filename}\n`);
  console.log('📋 Summary:');
  console.log(`   Articles: ${articleIds.length}`);
  console.log(`   Shoes: ${validationData.length}`);
  console.log(`   Critical fields: ${headers.filter(h => ['primary_use', 'cushioning_type', 'weight', 'foot_width', 'heel_height', 'drop', 'waterproof'].includes(h)).join(', ')}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Open the CSV file');
  console.log('   2. Create a copy named "validation-ground-truth.csv"');
  console.log('   3. Manually correct the values in the ground truth file');
  console.log('   4. Run validation comparison script');

  // Also create a template ground truth file with same structure
  const groundTruthFilename = `validation-ground-truth-TEMPLATE-${timestamp}.csv`;
  const groundTruthHeaders = [
    'article_id',
    'brand_name',
    'model',
    'primary_use_CORRECT',
    'cushioning_type_CORRECT',
    'weight_CORRECT',
    'foot_width_CORRECT',
    'heel_height_CORRECT',
    'drop_CORRECT',
    'waterproof_CORRECT',
    'notes',
  ];

  const groundTruthRows = [
    groundTruthHeaders.join(','),
    ...validationData.map(row => [
      row.article_id,
      row.brand_name,
      row.model,
      row.primary_use || '',
      row.cushioning_type || '',
      row.weight || '',
      row.foot_width || '',
      row.heel_height || '',
      row.drop || '',
      row.waterproof !== null ? row.waterproof : '',
      '', // notes column
    ].join(',')),
  ];

  writeFileSync(groundTruthFilename, groundTruthRows.join('\n'), 'utf-8');
  console.log(`\n✅ Ground truth template created: ${groundTruthFilename}`);
  console.log('   💡 Fill in the *_CORRECT columns with the right values from article content');
}

exportValidationDataset().catch(console.error);
