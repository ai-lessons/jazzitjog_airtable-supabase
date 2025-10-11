-- =====================================================
-- STAGING PIPELINE: Create staging_table & approval_logs
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create staging_table (same structure as shoe_results + airtable_id)
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

-- 2. Create approval_logs table
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID,
  total_approved INTEGER NOT NULL,
  brand_counts JSONB,
  total_in_shoe_results INTEGER NOT NULL,
  metadata JSONB
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staging_created_at ON staging_table(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_airtable_id ON staging_table(airtable_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_approved_at ON approval_logs(approved_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE staging_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies (if any)
DROP POLICY IF EXISTS "Admin can view staging_table" ON staging_table;
DROP POLICY IF EXISTS "Admin can insert into staging_table" ON staging_table;
DROP POLICY IF EXISTS "Admin can update staging_table" ON staging_table;
DROP POLICY IF EXISTS "Admin can delete from staging_table" ON staging_table;
DROP POLICY IF EXISTS "Admin can view approval_logs" ON approval_logs;
DROP POLICY IF EXISTS "Admin can insert into approval_logs" ON approval_logs;

-- 6. Create RLS policies for staging_table (admin only)
CREATE POLICY "Admin can view staging_table" ON staging_table
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can insert into staging_table" ON staging_table
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can update staging_table" ON staging_table
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can delete from staging_table" ON staging_table
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 7. Create RLS policies for approval_logs (admin only)
CREATE POLICY "Admin can view approval_logs" ON approval_logs
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can insert into approval_logs" ON approval_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 8. Grant permissions
GRANT ALL ON staging_table TO authenticated;
GRANT ALL ON approval_logs TO authenticated;
GRANT ALL ON staging_table TO service_role;
GRANT ALL ON approval_logs TO service_role;

-- =====================================================
-- DONE! Tables created with RLS policies
-- =====================================================

-- To verify, run:
-- SELECT * FROM staging_table LIMIT 1;
-- SELECT * FROM approval_logs LIMIT 1;
