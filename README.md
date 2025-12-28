# Sneaker Pipeline

AI-powered extraction and normalization of sneaker data → ETL → Supabase (Postgres) → protected web UI (search/filter/export).

## Overview
- Source: Running shoe articles (title/content/date/link)
- ETL: deterministic parsing + LLM fallback, normalization, QC, upsert
- Storage: Supabase Postgres (`public.shoe_results` + views/RPC)
- Web: Next.js app (staging/approval/search) with Supabase Auth

## Quick Start
1) Install deps
- `pnpm install` (or `npm install`)

2) Configure environment
- Copy `.env.example` to `.env.local` and fill keys
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`

3) Type-check and tests
- `pnpm type-check && pnpm test`

4) Run ETL
- Full run: `pnpm etl:run`
- Staging run: `pnpm etl:staging`
- CLI (limit/dry-run/upsert concurrency): `pnpm etl:run -- --limit=100 --dry-run --upsert-concurrency=8`

## Commands
- `pnpm dev` → `tsx src/main.ts`
- `pnpm build` → `tsc`
- `pnpm start` → `node dist/main.js`
- `pnpm etl:run` / `pnpm etl:staging` / `pnpm etl:cli`
- `pnpm test`, `pnpm test:watch`, `pnpm test:unit`, `pnpm test:integration`
- `pnpm type-check`

## Specs Backfill
Extract shoe specs (weight, stack, drop, price) from article HTML:
- Configure credentials in root `.env` file (see `.env.example`)
- Run: `npm run specs:backfill`
- Optional: Set `BATCH_SIZE` in `.env` or via PowerShell: `$env:BATCH_SIZE=20; npm run specs:backfill`

## Data Normalization (highlights)
- `upper_breathability` → `low|medium|high|null`
- `carbon_plate`, `waterproof` → `boolean|null` (GTX/water resistant = `true`)
- Numeric specs (drop/heights/weight/price) → `mm / g / USD`
- Duplicate prevention by `model_key`

## Migrations & DB
- Apply changes via SQL migrations only (see `supabase/migrations/*`)
- See `supabase/docs/DATABASE_CHANGELOG.md` for current schema and history
- Upsert concurrency: `UPSERT_CONCURRENCY` (default 5)

## Quality Gates
- `pnpm type-check`
- `pnpm test`
- No unhandled rejections during runs

## Security
- Never commit `.env*`
- Do not bypass RLS in client-side code

## Contributing
- Small, focused PRs. Include a verification step and update docs if architecture changed.
