-- Migration: Add performance indexes to shoe_results table
-- Date: 2025-10-01
-- Purpose: Optimize queries and ensure data integrity

-- First, check what indexes already exist
-- Run this query to see current state:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'shoe_results';

-- Note: search_vector column was removed from this migration as it doesn't exist in current schema

-- 2. B-tree indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_shoe_results_brand_name
ON shoe_results (brand_name);

CREATE INDEX IF NOT EXISTS idx_shoe_results_model
ON shoe_results (model);

CREATE INDEX IF NOT EXISTS idx_shoe_results_article_id
ON shoe_results (article_id);

-- 3. Composite index for brand + model queries
CREATE INDEX IF NOT EXISTS idx_shoe_results_brand_model
ON shoe_results (brand_name, model);

-- 4. Index on model_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_shoe_results_model_key
ON shoe_results (model_key);

-- 5. Composite unique constraint (if not exists)
-- This ensures no duplicate combinations of record_id + model_key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shoe_results_record_id_model_key_key'
    ) THEN
        ALTER TABLE shoe_results
        ADD CONSTRAINT shoe_results_record_id_model_key_key
        UNIQUE (record_id, model_key);
    END IF;
END $$;

-- 6. Indexes for common filter fields
CREATE INDEX IF NOT EXISTS idx_shoe_results_surface_type
ON shoe_results (surface_type)
WHERE surface_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shoe_results_cushioning_type
ON shoe_results (cushioning_type)
WHERE cushioning_type IS NOT NULL;

-- 7. Index for price range queries
CREATE INDEX IF NOT EXISTS idx_shoe_results_price
ON shoe_results (price)
WHERE price IS NOT NULL;

-- 8. Index for weight range queries
CREATE INDEX IF NOT EXISTS idx_shoe_results_weight
ON shoe_results (weight)
WHERE weight IS NOT NULL;

-- 9. Index for drop range queries
CREATE INDEX IF NOT EXISTS idx_shoe_results_drop
ON shoe_results (drop)
WHERE drop IS NOT NULL;

-- 10. Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_shoe_results_created_at
ON shoe_results (created_at DESC);

-- Verify indexes were created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'shoe_results'
ORDER BY indexname;

-- Check table statistics
ANALYZE shoe_results;

-- Display summary
SELECT
    COUNT(*) as total_rows,
    COUNT(DISTINCT brand_name) as unique_brands,
    COUNT(DISTINCT model) as unique_models,
    COUNT(DISTINCT model_key) as unique_model_keys
FROM shoe_results;
