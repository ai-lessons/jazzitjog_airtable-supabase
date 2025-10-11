-- Migration: Add airtable_id to shoe_results for duplicate prevention
-- Description: Track Airtable source and prevent duplicate imports

-- 1. Add airtable_id column (nullable for existing records)
ALTER TABLE shoe_results
ADD COLUMN IF NOT EXISTS airtable_id TEXT;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_shoe_results_airtable_id
ON shoe_results(airtable_id);

-- 3. Add unique constraint to prevent duplicates from same Airtable record
-- This ensures same shoe from same article can't be imported twice
ALTER TABLE shoe_results
ADD CONSTRAINT shoe_results_airtable_brand_model_key
UNIQUE (airtable_id, brand_name, model);

-- Note: This allows:
-- - Multiple reviews of same shoe from different articles (different airtable_id)
-- - Multiple shoes from same article (same airtable_id, different model)
-- But prevents:
-- - Same shoe from same article being imported twice

-- Migration complete!
