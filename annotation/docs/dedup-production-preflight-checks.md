# Dedup Compare Worker - Production Preflight Checks

## Purpose
Run these checks **before** deploying the dedup compare worker to production.

---

## 1. Database Schema Prerequisites

### 1.1 Verify JazzItJog_db Table Exists
```sql
-- Check table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'JazzItJog_db'
) AS jazzitjog_db_exists;
```
**Expected:** `t` (true)

---

### 1.2 Verify Required Columns Exist in JazzItJog_db
```sql
-- Check critical columns used by dedup flow
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'JazzItJog_db'
    AND column_name IN ('ID', 'Title', 'Article link', 'Feed', 'Published', 'New Title', 'Summary_published')
ORDER BY column_name;
```
**Expected:** All 7 columns should be present.

---

### 1.3 Check for Duplicate deleted_row_id Before Adding Unique Constraint (Migration 017)
```sql
-- Detect any existing duplicate rows in dedup_delete_log (if table already exists)
-- Run this BEFORE applying migration 017's unique constraint
SELECT 
    deleted_row_id,
    COUNT(*) as duplicate_count
FROM public.dedup_delete_log
GROUP BY deleted_row_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```
**Expected:** Zero rows (empty result). If rows appear, resolve duplicates before adding constraint.

---

## 2. Detect Existing Dedup Objects (Situational Awareness)

### 2.1 Check for Existing Dedup Tables
```sql
-- See which dedup tables already exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename LIKE 'dedup_%'
ORDER BY tablename;
```
**Note:** Empty result is OK for fresh deploy. If tables exist, understand their content.

---

### 2.2 Check for Existing Dedup Functions
```sql
-- List dedup-related functions that may already be defined
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE 'dedup_%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;
```
**Expected Functions (if already deployed):**
- `dedup_claim_compare_task_with_candidates`
- `dedup_complete_compare_task`
- `dedup_apply_compare_winner`
- `dedup_fail_compare_task`
- `dedup_prepare_compare_cycle`
- `dedup_enqueue_compare_tasks`
- `dedup_log_delete_candidates`
- `dedup_requeue_stale_compare_tasks`

---

### 2.3 Verify Repeats View Exists
```sql
-- Check that the view used for duplicate detection exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'repeats_jij_last45_actions'
) AS repeats_view_exists;
```
**Expected:** `t` (true) if view deployed.

---

## 3. Edge Function Configuration

**⚠️ Non-SQL Requirement:**
- **OPENAI_API_KEY** must be configured as an environment variable for the Edge Function in production.
- Verify via Supabase Dashboard: Project → Edge Functions → dedup-compare-worker → Settings → Environment Variables

---

## 4. Quick Health Check

### 4.1 Sample Data Verification
```sql
-- Quick check that JazzItJog_db has data for dedup to process
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN "Published" IS NULL THEN 1 END) as pending_rows,
    COUNT(CASE WHEN "Published" = 'Done' THEN 1 END) as done_rows
FROM public."JazzItJog_db";
```
**Expected:** At least some rows with `"Published"` IS NULL for dedup to process.

---

### 4.2 Verify Feed Column Format
```sql
-- Check feed values for potential formatting issues
SELECT DISTINCT "Feed"
FROM public."JazzItJog_db"
WHERE "Feed" IS NOT NULL
ORDER BY "Feed"
LIMIT 10;
```
**Note:** Worker appends `+++` to winner feeds. Ensure no existing feed values already end with `+++`.

---

## 5. Critical Preflight Summary

**✅ MUST PASS BEFORE DEPLOY:**
1. JazzItJog_db table exists with all required columns
2. No duplicate deleted_row_id values (if dedup_delete_log exists)
3. OPENAI_API_KEY configured for Edge Function

**⚠️ SITUATIONAL AWARENESS:**
- Existing dedup tables/functions may indicate partial previous deployment
- Data readiness (pending articles for dedup to process)
