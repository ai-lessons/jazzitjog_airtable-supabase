# Staging Table Fix Summary

## Issues Fixed

### 1. Missing Columns in staging_table
**Problem:** `staging_table` was missing `additional_features` and `is_running_shoe` columns, causing insert failures.

**Solution:** Added migration `002-fix-staging-table-columns.sql`
```sql
ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS additional_features TEXT;
ALTER TABLE staging_table ADD COLUMN IF NOT EXISTS is_running_shoe BOOLEAN DEFAULT true;
```

### 2. Wrong UNIQUE Constraint
**Problem:** `staging_table` had UNIQUE constraint only on `airtable_id`, preventing multiple shoes from same article.

**Example:** Article 274 ("10 Best Winter Running Shoes") extracted 9 shoes, but only 1 was inserted.

**Solution:**
- Changed constraint to composite: `(airtable_id, brand_name, model)`
- Updated duplicate check logic in `src/etl/upsert/to_staging.ts`

**Migration 003:**
```sql
ALTER TABLE staging_table DROP CONSTRAINT IF EXISTS staging_table_airtable_id_key;
ALTER TABLE staging_table ADD CONSTRAINT staging_table_airtable_brand_model_key
  UNIQUE (airtable_id, brand_name, model);
CREATE INDEX IF NOT EXISTS idx_staging_airtable_brand_model
  ON staging_table(airtable_id, brand_name, model);
```

### 3. Improved Code Mapping
**File:** `src/etl/upsert/to_staging.ts:50-71`

- Explicit field mapping from `ShoeInput` to `staging_table` schema
- Proper handling of field name differences (e.g., `price` vs `price_usd`)

## Files Changed

1. `src/etl/upsert/to_staging.ts` - Fixed duplicate check and field mapping
2. `web-app/migrations/002-fix-staging-table-columns.sql` - Add missing columns
3. `web-app/migrations/003-fix-staging-unique-constraint.sql` - Fix unique constraint

## Testing

✅ **Article 274 Test:**
- Before: 1/9 shoes inserted
- After: 9/9 shoes inserted

✅ **Pipeline Test:**
```bash
npm run etl:staging
```

## GitHub Actions

Workflow: `.github/workflows/etl-staging.yml`
- Runs every 72 hours (3 days)
- Manual trigger: `workflow_dispatch`
- Required secrets:
  - `AIRTABLE_API_KEY`
  - `AIRTABLE_BASE_ID`
  - `AIRTABLE_TABLE_NAME`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `OPENAI_API_KEY`

## How It Works Now

1. **Fetch new articles** from Airtable
2. **Filter** articles not in `staging_table` or `shoe_results`
3. **Extract** sneaker specs using LLM (GPT-4o-mini)
4. **Normalize** and validate data
5. **Build** `ShoeInput` records
6. **Insert** to `staging_table` (multiple shoes per article allowed)
7. **Send email** notification if new items added

## Next Steps

After staging approval:
1. Review items in `staging_table` via web UI
2. Approve selected items
3. Items move to `shoe_results` (production)
4. Log approval in `approval_logs`

## Cleanup

Run to clear staging table:
```bash
node clear-staging-table.mjs
```
