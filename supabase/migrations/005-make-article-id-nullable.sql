-- Migration: Make article_id nullable in shoe_results

ALTER TABLE shoe_results
ALTER COLUMN article_id DROP NOT NULL;

-- Migration complete!
