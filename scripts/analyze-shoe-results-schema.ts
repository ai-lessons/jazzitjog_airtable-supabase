// Analyze shoe_results table structure
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeSchema() {
  try {
    // Get all columns by trying to select with invalid WHERE to see column names
    const { data, error } = await client
      .from('shoe_results')
      .select('*')
      .limit(0);

    if (error && error.code !== 'PGRST116') {
      console.error('Error:', error);
      return;
    }

    // Try to get one real row if exists
    const { data: sample } = await client
      .from('shoe_results')
      .select('*')
      .limit(1);

    console.log('📋 shoe_results table structure:\n');

    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]).sort();
      console.log('Columns (' + columns.length + ' total):');
      columns.forEach(col => {
        const val = sample[0][col];
        const type = val === null ? 'null' : typeof val;
        console.log(`  - ${col}: ${type} = ${JSON.stringify(val)}`);
      });
    } else {
      console.log('Table is empty. Trying to insert dummy row to see expected columns...\n');

      const { error: insertError } = await client
        .from('shoe_results')
        .insert({
          brand_name: 'Test',
          model: 'Test Model',
          model_key: 'test::test model',
          record_id: 'test_record_123',
          article_id: 999,
        })
        .select();

      if (insertError) {
        console.log('Expected columns from error:', insertError);
      }
    }

    console.log('\n📊 Expected fields from our ShoeInput type:');
    const expectedFields = [
      'id (UUID, auto)',
      'created_at (timestamp, auto)',
      'updated_at (timestamp, auto)',
      'article_id (number, NOT NULL)',
      'record_id (string, nullable)',
      'brand_name (string, NOT NULL)',
      'model (string, NOT NULL)',
      'model_key (string, NOT NULL, unique with record_id)',
      'heel_height (number, nullable)',
      'forefoot_height (number, nullable)',
      'drop (number, nullable)',
      'weight (number, nullable)',
      'price (number, nullable)',
      'upper_breathability (string, nullable)',
      'carbon_plate (boolean, nullable)',
      'waterproof (boolean, nullable)',
      'primary_use (string, nullable)',
      'cushioning_type (string, nullable)',
      'surface_type (string, nullable)',
      'foot_width (string, nullable)',
      'additional_features (text, nullable)',
      'date (string, nullable)',
      'source_link (string, nullable)',
    ];

    expectedFields.forEach(field => console.log(`  - ${field}`));

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeSchema();
