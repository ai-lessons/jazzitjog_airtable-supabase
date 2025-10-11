-- Migration: Remove UNIQUE constraint on (record_id, model_key)
-- Description: This constraint prevents multiple shoes with same model from different sources
-- Staging items don't have record_id, so they all have NULL which conflicts

-- Drop the unique constraint
ALTER TABLE shoe_results
DROP CONSTRAINT IF EXISTS shoe_results_record_id_model_key_key;

-- Note: This allows multiple entries for the same model from different sources
-- which is correct behavior for staging approval workflow

-- Migration complete!
