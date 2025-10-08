// Quick diagnostic script to check pipeline status
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Airtable from 'airtable';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkStatus() {
  console.log('🔍 Checking Pipeline Status\n');

  // 1. Check Supabase connection
  console.log('1️⃣ Checking Supabase...');
  const { data: stagingCount, error: stagingError } = await supabase
    .from('staging_table')
    .select('*', { count: 'exact', head: true });

  if (stagingError) {
    console.error('❌ Supabase error:', stagingError.message);
  } else {
    console.log(`✅ staging_table has ${stagingCount} rows`);
  }

  const { data: prodCount, error: prodError } = await supabase
    .from('shoe_results')
    .select('*', { count: 'exact', head: true });

  if (prodError) {
    console.error('❌ shoe_results error:', prodError.message);
  } else {
    console.log(`✅ shoe_results has ${prodCount} rows`);
  }

  // 2. Check Airtable connection
  console.log('\n2️⃣ Checking Airtable...');
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const records = await base(process.env.AIRTABLE_TABLE_NAME || 'Running Shoe Articles')
      .select({ maxRecords: 5 })
      .firstPage();

    console.log(`✅ Airtable has ${records.length} records (showing first 5)`);

    if (records.length > 0) {
      console.log('\nSample record:');
      const record = records[0];
      console.log({
        id: record.id,
        title: record.fields.Title,
        hasContent: !!record.fields.Content,
        date: record.fields.Date,
      });
    }
  } catch (error) {
    console.error('❌ Airtable error:', error.message);
  }

  // 3. Check environment variables
  console.log('\n3️⃣ Checking Environment Variables...');
  const requiredVars = [
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID',
    'AIRTABLE_TABLE_NAME',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'OPENAI_API_KEY'
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.slice(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
    }
  }

  // 4. Check for duplicates
  console.log('\n4️⃣ Checking for existing records...');
  const { data: stagingIds } = await supabase
    .from('staging_table')
    .select('airtable_id');

  const { data: prodIds } = await supabase
    .from('shoe_results')
    .select('record_id');

  console.log(`📊 Staging IDs: ${stagingIds?.length || 0}`);
  console.log(`📊 Production IDs: ${prodIds?.length || 0}`);
  console.log(`📊 Total unique IDs: ${new Set([
    ...(stagingIds?.map(r => r.airtable_id) || []),
    ...(prodIds?.map(r => r.record_id) || [])
  ]).size}`);
}

checkStatus().catch(console.error);
