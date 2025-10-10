import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  try {
    console.log('📝 Reading migration file...');
    const sql = readFileSync('./web-app/migrations/004-add-is-edited-to-staging.sql', 'utf-8');

    console.log('🚀 Applying migration...');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`  Executing: ${statement.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error('❌ Error:', error);
        process.exit(1);
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify the column was added
    const { data, error } = await supabase
      .from('staging_table')
      .select('id, is_edited')
      .limit(1);

    if (error) {
      console.error('⚠️ Warning: Could not verify migration:', error);
    } else {
      console.log('✅ Verified: is_edited column is accessible');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
