# Sneaker Pipeline

AI-powered extraction and normalization of sneaker data from Airtable → ETL → Supabase (Postgres) → protected web UI (search/filter/export).

## Overview
- Source: Airtable articles (title/content/date/link)
- ETL: deterministic parsing + LLM fallback, normalization, QC, upsert
- Storage: Supabase Postgres (`public.shoe_results` + views/RPC)
- Web: Next.js app (staging/approval/search) with Supabase Auth

## Quick Start
1) Install deps
- `pnpm install` (or `npm install`)

2) Configure environment
- Copy `.env.example` to `.env.local` and fill keys
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`
  - `OPENAI_API_KEY`

3) Type-check and tests
- `pnpm type-check && pnpm test`

4) Run ETL (env-driven)
- Full run: `pnpm etl:run`
- Staging run: `pnpm etl:staging`
- CLI (limit/dry-run): `pnpm sync -- --limit=100 --dry-run`

## Commands
- `pnpm dev` → `tsx src/main.ts`
- `pnpm build` → `tsc`
- `pnpm start` → `node dist/main.js`
- `pnpm sync` → `tsx src/cli/index.ts sync-airtable`
- `pnpm simple` → `tsx src/simple-main.ts`
- `pnpm etl:run` / `pnpm etl:staging` / `pnpm etl:cli`
- `pnpm test`, `pnpm test:watch`, `pnpm test:unit`, `pnpm test:integration`
- `pnpm type-check`

## Data Normalization (highlights)
- `upper_breathability` → `low|medium|high|null`
- `carbon_plate`, `waterproof` → `boolean|null` (GTX/water resistant = `true`)
- Numeric specs (drop/heights/weight/price) → `mm / g / USD`
- Duplicate prevention by `model_key` and by `(airtable_id, brand_name, model)`

## Migrations & DB
- Apply changes via SQL migrations only (see `web-app/migrations/*` for current set; to be relocated to `supabase/migrations/`)
- See `supabase/docs/DATABASE_CHANGELOG.md` for current schema and history

## Quality Gates
- `pnpm type-check`
- `pnpm test`
- No unhandled rejections during runs

## Security
- Never commit `.env*`
- Do not bypass RLS in client-side code

## Contributing
- Small, focused PRs. Include a verification step and update docs if architecture changed.

