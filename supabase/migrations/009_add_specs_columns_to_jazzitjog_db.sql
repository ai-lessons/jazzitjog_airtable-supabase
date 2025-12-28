-- Add DOM specs columns to public."JazzItJog_db" table
-- This migration is idempotent: it will only add columns if they don't already exist.

DO $$
BEGIN
    -- Add specs_json column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'JazzItJog_db' 
        AND column_name = 'specs_json'
    ) THEN
        ALTER TABLE public."JazzItJog_db" ADD COLUMN specs_json jsonb NULL;
    END IF;

    -- Add specs_extracted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'JazzItJog_db' 
        AND column_name = 'specs_extracted_at'
    ) THEN
        ALTER TABLE public."JazzItJog_db" ADD COLUMN specs_extracted_at timestamptz NULL;
    END IF;

    -- Add specs_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'JazzItJog_db' 
        AND column_name = 'specs_method'
    ) THEN
        ALTER TABLE public."JazzItJog_db" ADD COLUMN specs_method text NULL;
    END IF;
END $$;

-- Optional: Add a comment to describe the new columns
COMMENT ON COLUMN public."JazzItJog_db".specs_json IS 'Raw JSON of extracted DOM specs from the article';
COMMENT ON COLUMN public."JazzItJog_db".specs_extracted_at IS 'Timestamp when DOM specs were extracted';
COMMENT ON COLUMN public."JazzItJog_db".specs_method IS 'Method used for DOM specs extraction (e.g., manual, automated)';
