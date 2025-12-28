-- Migration to add article_id_int columns and indexes

-- Add article_id_int to shoe_results (if not exists)
ALTER TABLE shoe_results 
ADD COLUMN IF NOT EXISTS article_id_int BIGINT NULL;

-- Add article_id to staging_table (if not exists)
ALTER TABLE staging_table 
ADD COLUMN IF NOT EXISTS article_id BIGINT NULL;

-- Create index on shoe_results article_id_int (if not exists)
CREATE INDEX IF NOT EXISTS idx_shoe_results_article_id_int 
ON shoe_results(article_id_int);

-- Create index on staging_table article_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_staging_table_article_id 
ON staging_table(article_id);

-- Backfill shoe_results.article_id_int from article_id (safe numeric conversion)
UPDATE shoe_results 
SET article_id_int = 
    CASE 
        WHEN article_id ~ '^\d+$' THEN article_id::bigint 
        ELSE NULL 
    END
WHERE article_id_int IS NULL AND article_id ~ '^\d+$';
