-- Migration: Remove CHECK constraint that prevents inserting shoes without specs
-- Date: 2025-10-01
-- Purpose: Allow insertion of brand+model even without physical specs (weight, drop, etc.)
-- Reason: Roundup articles often mention shoes without detailed specifications

-- Drop the constraint
ALTER TABLE shoe_results
DROP CONSTRAINT IF EXISTS shoe_results_core_fields_nonempty_chk;

-- Verify constraint is gone
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'shoe_results'::regclass
  AND contype = 'c'
ORDER BY conname;
