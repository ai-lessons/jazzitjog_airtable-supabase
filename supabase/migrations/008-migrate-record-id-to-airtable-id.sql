-- Migration: Replace record_id with airtable_id in shoe_results
-- Description: Consolidate duplicate fields, keep only airtable_id

-- 1. Copy record_id to airtable_id for existing records
UPDATE shoe_results
SET airtable_id = record_id
WHERE airtable_id IS NULL
  AND record_id IS NOT NULL;

-- 2. Drop the old unique constraint if it exists
ALTER TABLE shoe_results
DROP CONSTRAINT IF EXISTS shoe_results_record_id_model_key_key;

-- 3. Drop the old index if it exists
DROP INDEX IF EXISTS idx_shoe_results_record_id;

-- 4. Drop dependent views first
DROP VIEW IF EXISTS v_shoes_latest CASCADE;
DROP VIEW IF EXISTS v_shoes_qc CASCADE;

-- 5. Drop the record_id column
ALTER TABLE shoe_results
DROP COLUMN IF EXISTS record_id;

-- 6. Recreate views with airtable_id instead of record_id
CREATE OR REPLACE VIEW v_shoes_latest AS
SELECT DISTINCT ON (brand_name, model)
  id,
  brand_name,
  model,
  primary_use,
  surface_type,
  heel_height,
  forefoot_height,
  drop,
  weight,
  price,
  carbon_plate,
  waterproof,
  cushioning_type,
  foot_width,
  upper_breathability,
  additional_features,
  source_link,
  article_id,
  airtable_id,
  date,
  created_at,
  updated_at,
  model_key
FROM shoe_results
ORDER BY brand_name, model, created_at DESC;

CREATE OR REPLACE VIEW v_shoes_qc AS
SELECT
  id,
  brand_name,
  model,
  airtable_id,
  article_id,
  CASE
    WHEN brand_name IS NULL OR brand_name = '' THEN 'Missing brand'
    WHEN model IS NULL OR model = '' THEN 'Missing model'
    WHEN price IS NULL THEN 'Missing price'
    WHEN weight IS NULL THEN 'Missing weight'
    ELSE 'OK'
  END as quality_status,
  created_at
FROM shoe_results;

-- Note: airtable_id is now the single source of truth for Airtable record tracking
-- NULL values are allowed (for manually added records or records from other sources)

-- Migration complete!
