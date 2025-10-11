-- Migration: Fix staging_table to match ShoeInput type
-- Description: Add missing columns to staging_table

-- Add missing columns
ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS additional_features TEXT;
ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_running_shoe BOOLEAN DEFAULT true;

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_staging_brand_model ON staging_table(brand_name, model);
CREATE INDEX IF NOT EXISTS idx_staging_is_running_shoe ON staging_table(is_running_shoe);
