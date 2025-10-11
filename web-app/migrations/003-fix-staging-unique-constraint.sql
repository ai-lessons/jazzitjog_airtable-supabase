-- Migration: Fix staging_table unique constraint
-- Description: Allow multiple shoes from same article
--
-- Problem: staging_table has UNIQUE constraint on airtable_id alone,
-- which prevents inserting multiple shoes from the same article.
--
-- Solution: Change to composite unique constraint on (airtable_id, brand_name, model)

-- Drop old unique constraint on airtable_id
ALTER TABLE staging_table DROP CONSTRAINT IF EXISTS staging_table_airtable_id_key;

-- Add composite unique constraint
ALTER TABLE staging_table
ADD CONSTRAINT staging_table_airtable_brand_model_key
UNIQUE (airtable_id, brand_name, model);

-- Also add index for performance
CREATE INDEX IF NOT EXISTS idx_staging_airtable_brand_model
ON staging_table(airtable_id, brand_name, model);
