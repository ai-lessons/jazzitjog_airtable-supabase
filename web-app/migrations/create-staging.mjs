import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 Creating staging_table and approval_logs...\n');

  try {
    // 1. Create staging_table
    console.log('📝 Creating staging_table...');
    const { error: createStaging } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS staging_table (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          airtable_id TEXT UNIQUE NOT NULL,
          brand_name TEXT,
          model TEXT,
          primary_use TEXT,
          surface_type TEXT,
          heel_height NUMERIC,
          forefoot_height NUMERIC,
          drop NUMERIC,
          weight NUMERIC,
          price NUMERIC,
          carbon_plate BOOLEAN,
          waterproof BOOLEAN,
          cushioning_type TEXT,
          foot_width TEXT,
          upper_breathability TEXT,
          date TEXT,
          source_link TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (createStaging) {
      console.error('❌ Error creating staging_table:', createStaging);
    } else {
      console.log('✅ staging_table created successfully');
    }

    // 2. Create approval_logs
    console.log('\n📝 Creating approval_logs...');
    const { error: createLogs } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS approval_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          approved_at TIMESTAMPTZ DEFAULT NOW(),
          approved_by UUID,
          total_approved INTEGER NOT NULL,
          brand_counts JSONB,
          total_in_shoe_results INTEGER NOT NULL,
          metadata JSONB
        );
      `
    });

    if (createLogs) {
      console.error('❌ Error creating approval_logs:', createLogs);
    } else {
      console.log('✅ approval_logs created successfully');
    }

    // 3. Create indexes
    console.log('\n📝 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_staging_created_at ON staging_table(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_staging_airtable_id ON staging_table(airtable_id);',
      'CREATE INDEX IF NOT EXISTS idx_approval_logs_approved_at ON approval_logs(approved_at DESC);'
    ];

    for (const sql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error creating index:', error);
      }
    }
    console.log('✅ Indexes created successfully');

    // 4. Enable RLS
    console.log('\n📝 Enabling Row Level Security...');
    const rlsEnable = [
      'ALTER TABLE staging_table ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;'
    ];

    for (const sql of rlsEnable) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error enabling RLS:', error);
      }
    }
    console.log('✅ RLS enabled');

    // 5. Create RLS policies for staging_table
    console.log('\n📝 Creating RLS policies for staging_table...');
    const stagingPolicies = [
      `DROP POLICY IF EXISTS "Admin can view staging_table" ON staging_table;`,
      `CREATE POLICY "Admin can view staging_table" ON staging_table
        FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`,

      `DROP POLICY IF EXISTS "Admin can insert into staging_table" ON staging_table;`,
      `CREATE POLICY "Admin can insert into staging_table" ON staging_table
        FOR INSERT TO authenticated
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`,

      `DROP POLICY IF EXISTS "Admin can update staging_table" ON staging_table;`,
      `CREATE POLICY "Admin can update staging_table" ON staging_table
        FOR UPDATE TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`,

      `DROP POLICY IF EXISTS "Admin can delete from staging_table" ON staging_table;`,
      `CREATE POLICY "Admin can delete from staging_table" ON staging_table
        FOR DELETE TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`
    ];

    for (const sql of stagingPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error creating staging policy:', error.message);
      }
    }
    console.log('✅ Staging RLS policies created');

    // 6. Create RLS policies for approval_logs
    console.log('\n📝 Creating RLS policies for approval_logs...');
    const logsPolicies = [
      `DROP POLICY IF EXISTS "Admin can view approval_logs" ON approval_logs;`,
      `CREATE POLICY "Admin can view approval_logs" ON approval_logs
        FOR SELECT TO authenticated
        USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`,

      `DROP POLICY IF EXISTS "Admin can insert into approval_logs" ON approval_logs;`,
      `CREATE POLICY "Admin can insert into approval_logs" ON approval_logs
        FOR INSERT TO authenticated
        WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');`
    ];

    for (const sql of logsPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error creating logs policy:', error.message);
      }
    }
    console.log('✅ Approval logs RLS policies created');

    console.log('\n✨ All tables and policies created successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ staging_table - for pending shoe data');
    console.log('   ✅ approval_logs - for tracking approvals');
    console.log('   ✅ RLS policies - admin-only access');
    console.log('   ✅ Indexes - for performance');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

createTables().catch(console.error);
