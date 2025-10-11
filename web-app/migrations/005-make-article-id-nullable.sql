-- Migration: Make article_id nullable in shoe_results
-- Description: article_id is not available for items from staging_table

-- Make article_id nullable
ALTER TABLE shoe_results
ALTER COLUMN article_id DROP NOT NULL;

-- Migration complete!
