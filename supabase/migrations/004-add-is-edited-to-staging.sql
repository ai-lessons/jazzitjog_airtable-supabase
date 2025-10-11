-- Migration: Add is_edited field to staging_table
-- Description: Track which items have been edited and are ready for approval

-- Add is_edited column with default false
ALTER TABLE staging_table
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Create index for filtering edited items
CREATE INDEX IF NOT EXISTS idx_staging_is_edited ON staging_table(is_edited);

-- Migration complete!
