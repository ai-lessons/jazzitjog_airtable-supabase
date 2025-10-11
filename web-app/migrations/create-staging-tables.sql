-- Migration: Create staging_table and approval_logs tables
-- Description: Tables for staging new shoe data and logging approvals

-- 1. Create staging_table (same structure as shoe_results + metadata)
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
  date TEXT,
  source_link TEXT,
  cushioning_type TEXT,
  foot_width TEXT,
  upper_breathability TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create approval_logs table
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  total_approved INTEGER NOT NULL,
  brand_counts JSONB,
  total_in_shoe_results INTEGER NOT NULL,
  metadata JSONB
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staging_created_at ON staging_table(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_airtable_id ON staging_table(airtable_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_approved_at ON approval_logs(approved_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE staging_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for staging_table
-- Only users with role='admin' in metadata can access
CREATE POLICY "Admin can view staging_table" ON staging_table
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can insert into staging_table" ON staging_table
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can update staging_table" ON staging_table
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can delete from staging_table" ON staging_table
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 6. RLS Policies for approval_logs
CREATE POLICY "Admin can view approval_logs" ON approval_logs
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can insert into approval_logs" ON approval_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 7. Service role bypass (for GitHub Actions)
-- Service role key bypasses RLS automatically

-- 8. Grant permissions
GRANT ALL ON staging_table TO authenticated;
GRANT ALL ON approval_logs TO authenticated;
GRANT ALL ON staging_table TO service_role;
GRANT ALL ON approval_logs TO service_role;

-- Migration complete!
