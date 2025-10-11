# Database Changelog

This file documents the current schema and notable changes for Sneaker Pipeline.

Last Updated: 2025-10-10

---

## Current Key Objects

- Table: `public.shoe_results`
  - Purpose: canonical storage for extracted/normalized sneaker rows
  - Uniqueness: `UNIQUE(airtable_id, brand_name, model)` — prevents duplicates from the same Airtable article
  - Common columns: `brand_name text, model text, primary_use text, surface_type text, heel_height numeric, forefoot_height numeric, drop numeric, weight numeric, price numeric, carbon_plate boolean, waterproof boolean, cushioning_type text, foot_width text, upper_breathability text, additional_features text, source_link text, article_id text, airtable_id text, date text, created_at timestamptz, updated_at timestamptz, model_key text`

- View: `public.v_shoes_latest`
  - Purpose: distinct latest rows by brand/model (ordered by `created_at desc`)

- View: `public.v_shoes_qc`
  - Purpose: simple QC view with status labels for missing key fields

- Staging: `public.staging_table`, `public.approval_logs`
  - RLS enabled; admin-only policies

---

## Change History (highlights)

2025-10-10
- Create initial changelog from codebase and migrations under `web-app/migrations/*`.

2025-10 (web-app/migrations/008-migrate-record-id-to-airtable-id.sql)
- Replace `record_id` with `airtable_id` in `shoe_results`.
- Drop dependent views and recreate using `airtable_id`.

2025-10 (web-app/migrations/007-add-airtable-id-to-shoe-results.sql)
- Add `airtable_id` column and index.
- Add unique constraint `shoe_results_airtable_brand_model_key` on `(airtable_id, brand_name, model)`.

2025-10 (web-app/migrations/006-remove-unique-constraint-shoe-results.sql)
- Remove unique constraint on `(record_id, model_key)` to support staging/approval workflow.

Earlier
- Create staging tables and RLS policies (`web-app/migrations/create-staging-tables.sql`).

---

## Notes & Next Steps

- Migrations are currently stored in `web-app/migrations/*`. Plan to relocate into `supabase/migrations/` and standardize migration workflow (add scripts and docs).
- Ensure all writers use `(airtable_id, brand_name, model)` for conflict targets.
- Keep this changelog updated alongside any schema change.
