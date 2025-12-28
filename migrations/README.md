# Database Migration: Article Linkage Columns

## Migration 003: Add Article ID Integer Columns

### Purpose
This migration adds integer-based article ID columns to improve data linkage between `shoe_results` and `JazzItJog_db` tables.

### Changes
- Added `article_id_int` (BIGINT) to `shoe_results`
- Added `article_id` (BIGINT) to `staging_table`
- Created indexes on new columns
- Backfilled `article_id_int` from existing `article_id`

### Verification
Use the `scripts/article-linkage-diagnostics.ts` script to:
- Check total rows
- Verify article ID conversions
- Assess matching rate with `JazzItJog_db`

### Execution
```bash
pnpm migrate:run
```

### Diagnostics
```bash
pnpm tsx scripts/article-linkage-diagnostics.ts
```

### Constraints
- Preserves existing text-based `article_id`
- Safely converts numeric article IDs
- Does not drop any existing columns

### Next Steps
1. Review migration results
2. Run diagnostics script
3. Assess foreign key constraint feasibility
