# AGENTS.md

## Project Overview
**Project:** Sneaker Pipeline  
**Purpose:** AI-powered extraction and normalization of sneaker data from Airtable → ETL → Supabase (Postgres) → protected web UI (search/filter/export).

**High-level flow**  
Airtable (articles) → ETL (parsing + normalization + QC) → Supabase (`public.shoe_results` + views/RPC) → web (Vite + React) with Supabase Auth.

---

## Read First (Priority Order)
1. `PROJECT_ARCHITECTURE.md` — single source of truth for architecture/backlog/status  
2. `supabase/docs/DATABASE_CHANGELOG.md` — current DB structure and changes  
3. `README.md` — setup & quick start

---

## Never Do
- Create/alter DB tables **without** a proper migration.
- Duplicate OpenAI calls or run blind loops in polling/parsing.
- Commit secrets or `.env*` files.
- Bypass RLS policies or write around the data access layer.
- Push large or destructive changes without a plan and a verification step.
- Skip updating documentation after architectural changes.

## Always Do
- Read `PROJECT_ARCHITECTURE.md` before non-trivial changes.
- Ship DB changes **via migrations** only.
- Keep TypeScript types synchronized with the DB schema.
- Ask for confirmation before major refactors or behavior changes.
- Reuse existing patterns (ETL stages, mappers, validators) when possible.
- Update `DATABASE_CHANGELOG.md` when the schema changes.
- Close a task/sprint only after **code + docs + checks** are green.

---

## Tech Stack
- **Language:** Node.js + TypeScript
- **Key packages:** Airtable, OpenAI, Supabase JS, Zod, pino, dayjs, fast-csv, p-queue
- **Build/Run:** `tsx`, `tsc`
- **Tests:** Vitest
- **Infra:** Supabase (Postgres + RLS + Storage)
- **Auth (web):** Supabase Auth (email magic link)
- **Web (planned/used):** Vite + React (+ Tailwind if applicable)

---

## Commands (from package.json)
- Dev entry: `pnpm dev` → `tsx src/main.ts`
- Build: `pnpm build` → `tsc`
- Start: `pnpm start` → `node dist/main.js`
- Sync Airtable: `pnpm sync` → `tsx src/cli/index.ts sync-airtable`
- Simple run: `pnpm simple` → `tsx src/simple-main.ts`
- ETL: `pnpm etl:run` / `pnpm etl:staging` / `pnpm etl:cli`
- Tests: `pnpm test`, `pnpm test:watch`, `pnpm test:unit`, `pnpm test:integration`
- Type checks: `pnpm type-check`

> **Agent tip:** Prefer `pnpm type-check && pnpm test` before proposing edits across multiple modules.

---

## Codex Usage (IDE + CLI)
- **Primary context file:** this `AGENTS.md`. Always read it before making multi-file edits.  
- **Approvals:** Ask before running commands, writing files, changing schema, or modifying CI.  
- **Scope control:** One change set at a time; include a short test or verification step.  
- **When unsure:** Propose a small diff with comments explaining intent and rollback.

---

## Security & Secrets
- Never commit `.env*` or credentials. Use local `.env.local` (git-ignored) and CI secrets.
- Treat API keys and service role keys as sensitive; avoid printing them in logs.
- Any network call to third-party services must be explicit and justified in the change description.

---

## Data & Normalization (critical for quality)
- **Target table:** `public.shoe_results` (+ views/RPC, e.g., `v_shoes_latest`, `search_shoes(...)`)
- **Normalization rules (examples):**
  - `upper_breathability` → `"low" | "medium" | "high" | null`
  - `carbon_plate`, `waterproof` → `boolean | null` (treat “water resistant/GTX” as `true`)
  - Numeric specs (drop, heights, weight, price) → convert to canonical units (mm / g / numeric)
- **Duplicates:** Prevent duplicates by `model_key` (e.g., lowercased brand+model after cleanup).
- **Irrelevant content:** filter out non-running-shoe items (apparel/accessories/etc.).

---

## Architecture Guardrails
- **One step = one instruction + a verification step.** Don’t batch destructive actions.
- All DB changes **only** through migrations under `supabase/migrations/`.
- No direct writes that bypass `saveToSupabase`/ETL writers; respect RLS and policies.
- Avoid “hot” `ALTER` statements; prefer additive migrations and backfills.
- Keep CI/CD and local scripts in sync; document any manual steps.

---

## Quality Gates
- Code compiles: `pnpm type-check`  
- Tests pass: `pnpm test` (include at least unit tests for parsers/mappers)  
- No console errors or unhandled promise rejections in dev runs  
- Documentation updated:
  - `PROJECT_ARCHITECTURE.md` — status/backlog/decisions
  - `supabase/docs/DATABASE_CHANGELOG.md` — every schema change
  - `README.md` — commands and setup deltas

---

## ETL Patterns (recommended)
1) **Parse & Extract (Content → candidates)**  
   - Use deterministic rules first (Title hints brand/model; Content confirms).  
   - If Title lacks a single clear model, allow multi-model extraction from one article.  
   - Only process *running shoes*.

2) **Normalize (candidates → canonical fields)**  
   - Map units and categorical fields per spec above.  
   - Generate `model_key` (brand/model normalized).

3) **Validate / QC**  
   - Reject only fully empty records; otherwise keep but flag as low confidence.  
   - Log parse coverage stats (missing fields, unit conversions, anomalies).

4) **Upsert**  
   - Upsert to `public.shoe_results` with conflict rules on `model_key` (+ source/date where needed).  
   - Prefer batch upserts with small, bounded concurrency (e.g., `p-queue`).

---

## Polling / External API Hygiene
- Debounce or reuse last check when polling external APIs (OpenAI or sources) to avoid duplicates.
- Backoff on rate limits; log structured events via `pino`.
- Never loop without bounds; add max attempts and a time budget.

---

## Error Handling & Logging
- Use structured logs (`pino`) with context (module, article_id, model_key).
- Fail noisy: surface parse errors but keep the pipeline running with counters.

---

## Naming Conventions
```ts
// Files
parse-runrepeat.ts         // feature-action
shoe-results.service.ts    // module.service

// React (if present)
MyComponent.tsx            // PascalCase

// Variables
const modelKey = ''        // camelCase
const MAX_BATCH = 50       // SCREAMING_SNAKE for constants

// DB
shoe_results               // snake_case table
created_at                 // snake_case columns

// Functions
async fetchArticles()      // verbs for actions
function isCarbonPlated()  // is/has/can for booleans
