-- Migration 017: Add unique constraint for dedup_delete_log.deleted_row_id
-- This migration adds the unique constraint required by dedup_log_delete_candidates()
-- for its ON CONFLICT (deleted_row_id) clause
-- 
-- Note: The remote_public_schema.sql does NOT contain a unique constraint/index
-- on deleted_row_id, but the local function dedup_log_delete_candidates() 
-- uses ON CONFLICT (deleted_row_id) DO NOTHING, which requires this constraint.
-- 
-- The remote schema uses a different approach with WHERE NOT EXISTS,
-- but for local development consistency, we add the constraint here.

-- Make the migration idempotent by checking if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dedup_delete_log_deleted_row_id_key' 
    AND conrelid = 'public.dedup_delete_log'::regclass
  ) THEN
    -- Add unique constraint to dedup_delete_log table
    -- This enables dedup_log_delete_candidates() to use ON CONFLICT clause for deduplication
    ALTER TABLE ONLY "public"."dedup_delete_log"
      ADD CONSTRAINT "dedup_delete_log_deleted_row_id_key" 
      UNIQUE ("deleted_row_id");
  END IF;
END
$$;