# Database Migrations

## How to run migrations

Since `exec_sql` RPC function is not available, migrations must be run manually through Supabase SQL Editor.

### Steps:

1. Go to your Supabase project: https://supabase.com/dashboard/project/fqcwpcyxofowscluryej
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file (e.g., `001_add_indexes_to_shoe_results.sql`)
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Check the output for any errors

### Available Migrations:

- `001_add_indexes_to_shoe_results.sql` - Adds performance indexes to shoe_results table ✅ DONE
- `002_remove_check_constraint.sql` - Removes CHECK constraint to allow shoes without specs 🔄 PENDING

### Migration 001: Add Indexes

This migration adds the following indexes:

**Performance indexes:**
- `idx_shoe_results_search_vector` (GIN) - Full-text search
- `idx_shoe_results_brand_name` (B-tree) - Brand lookups
- `idx_shoe_results_model` (B-tree) - Model lookups
- `idx_shoe_results_article_id` (B-tree) - Article relation
- `idx_shoe_results_brand_model` (B-tree) - Composite brand+model
- `idx_shoe_results_model_key` (B-tree) - Model key lookups

**Data integrity:**
- `shoe_results_record_id_model_key_key` (Unique) - Prevents duplicates

**Filter indexes (partial):**
- `idx_shoe_results_surface_type` - Surface type filters
- `idx_shoe_results_cushioning_type` - Cushioning filters
- `idx_shoe_results_price` - Price range queries
- `idx_shoe_results_weight` - Weight range queries
- `idx_shoe_results_drop` - Drop range queries
- `idx_shoe_results_created_at` - Chronological queries

All indexes use `IF NOT EXISTS` so the migration is safe to run multiple times.

### Migration 002: Remove CHECK Constraint

**Problem:** The table has a CHECK constraint `shoe_results_core_fields_nonempty_chk` that requires at least some physical specs (weight, drop, price, etc.) to be filled. This prevents insertion of brand+model-only records from roundup articles.

**Solution:** Remove the CHECK constraint to allow insertion of shoes even without detailed specifications.

**Changes:**
- Drops `shoe_results_core_fields_nonempty_chk` constraint
- Verifies constraint removal by listing remaining check constraints

**Status:** 🔄 PENDING - Run this migration in Supabase SQL Editor

## Alternative: Direct SQL execution

If you have `psql` access or another PostgreSQL client:

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.fqcwpcyxofowscluryej.supabase.co:5432/postgres" \
  -f migrations/001_add_indexes_to_shoe_results.sql
```

Replace `[YOUR_PASSWORD]` with your database password from Supabase settings.
