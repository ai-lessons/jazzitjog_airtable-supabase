import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function testApprove() {
  try {
    console.log('1. Fetching staging items with is_edited=true...');
    const { data: stagingItems, error: fetchError } = await supabase
      .from('staging_table')
      .select('*')
      .eq('is_edited', true)
      .limit(1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return;
    }

    console.log('Found items:', stagingItems?.length);
    if (stagingItems && stagingItems.length > 0) {
      console.log('First item:', JSON.stringify(stagingItems[0], null, 2));

      // Test data preparation
      const item = stagingItems[0];
      const { id, airtable_id, created_at, is_edited, is_running_shoe, ...shoeData } = item;

      console.log('\n2. Prepared shoe data (after removing staging fields):');
      console.log(JSON.stringify(shoeData, null, 2));

      console.log('\n3. Checking shoe_results table structure...');
      const { data: sampleShoe, error: shoeError } = await supabase
        .from('shoe_results')
        .select('*')
        .limit(1);

      if (shoeError) {
        console.error('Shoe results error:', shoeError);
      } else if (sampleShoe && sampleShoe.length > 0) {
        console.log('Sample shoe_results columns:', Object.keys(sampleShoe[0]));
      }

      console.log('\n4. Testing insert into shoe_results...');
      const { error: insertError } = await supabase
        .from('shoe_results')
        .insert([shoeData]);

      if (insertError) {
        console.error('❌ Insert error:', insertError);
      } else {
        console.log('✅ Insert succeeded! Rolling back...');

        // Delete the test insert
        await supabase
          .from('shoe_results')
          .delete()
          .eq('brand_name', shoeData.brand_name)
          .eq('model', shoeData.model)
          .order('created_at', { ascending: false })
          .limit(1);
      }
    } else {
      console.log('No items with is_edited=true found');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApprove();
