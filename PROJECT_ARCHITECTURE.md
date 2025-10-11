# Project Architecture Overview

**Project:** Sneaker Pipeline  
**Version:** 1.0  
**Last Updated:** 2025-10-10  
**Status:** Active

---

## Quick Reference

Architecture: Airtable (articles) → ETL (ingest → extract → normalize → build → upsert) → Supabase (`public.shoe_results` + views/RPC) → Web (Next.js) with Supabase Auth.

Key files to read:
- `README.md` — setup & commands
- `supabase/docs/DATABASE_CHANGELOG.md` — schema & history
- `src/etl/run.ts` — pipeline orchestrator
- `src/etl/extract/orchestrator.ts` — regex + LLM hybrid extractor
- `src/etl/normalize/fields.ts` — canonical units & categorical mapping
- `src/integrations/*` — Airtable & Supabase clients/RPC

---

## Technology Stack

- Language: Node.js + TypeScript
- Core libs: Airtable, Supabase JS, Zod, pino, dayjs, p-queue, fast-csv
- AI: OpenAI (LLM fallback in extraction)
- Tests: Vitest
- Web: Next.js (staging/approval/search) + Supabase Auth

---

## Project Structure (selected)

```
src/
  core/          # logger, metrics, utils, validation, units, types
  integrations/  # airtable & supabase clients + rpc
  etl/
    ingest/      # from_airtable
    extract/     # title analysis, regex + LLM orchestrator
    normalize/   # fields normalization & QC
    build/       # model_key + ShoeInput builder
    upsert/      # to_supabase (DB write)
    run.ts       # full pipeline orchestrator
  cli/           # CLI entry (sync-airtable)

web-app/         # Next.js app (staging, approval, search)
web-app/migrations/  # current SQL migrations (to be moved)

supabase/
  docs/DATABASE_CHANGELOG.md  # schema & changes (new)
```

---

## Core Architecture Decisions

1) Deterministic-first Extraction
- Try regex/structured parsing first, then fallback to LLM for coverage
- Merge strategy for specific-article case: keep numeric from regex, enrich text fields from LLM

2) Canonical Normalization
- Heights, drop, weight, price to canonical units (mm / g / USD)
- Booleans: `carbon_plate`, `waterproof` with GTX/water-resistant ⇒ `true`
- `upper_breathability` mapped to `low|medium|high|null`

3) Duplicate Prevention & Keys
- `model_key` = normalized `brand + model` (space-separated)
- DB uniqueness: `(airtable_id, brand_name, model)` to avoid duplicates per article

4) DB Safety
- Migrations only (SQL), prefer additive changes
- RLS on staging/approval tables; service role only server-side

---

## Data Flow

1) Ingest (Airtable)
- Flexible field mapping, article filtering by title/content heuristic

2) Extract
- Title analysis ⇒ scenario (specific | brand-only | general)
- Regex first; fallback to LLM if insufficient; hybrid enrich for missing text fields

3) Normalize/QC
- Unit conversions, range validation, warnings collection

4) Build
- `ShoeInput` with `model_key` and metadata (airtable_id, date, source_link)

5) Upsert
- Batch upsert to `public.shoe_results` (bounded concurrency planned)
- Conflict `(airtable_id, brand_name, model)`

---

## Status & Backlog (excerpt)

Completed
- Modular ETL pipeline with metrics & logging
- Regex + LLM hybrid extraction
- Normalization rules for core fields

In Progress
- CLI entry `src/cli/index.ts` for `sync-airtable`
- Documentation refresh (this file + README + DB changelog)

Planned (priority)
- Move migrations to `supabase/migrations/` and formalize workflow
- Batch upsert with `p-queue` and better created/updated detection
- LLM hygiene: throttling, backoff, per-article cache
- Remove legacy `record_id` usage across code/tests

---

## Development Standards
- Run `pnpm type-check && pnpm test` before multi-file edits
- Keep TS types in sync with DB schema
- No direct DB writes outside ETL writers; respect RLS
- Update `DATABASE_CHANGELOG.md` for any schema change
