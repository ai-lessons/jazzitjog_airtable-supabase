# System Patterns: Sneaker Pipeline

## System Architecture

### High-Level Flow
```
Airtable (articles) 
  → ETL Pipeline (ingest → extract → normalize → build → upsert)
  → Supabase PostgreSQL (shoe_results + views/RPC)
  → Next.js Web App (staging/approval/search)
  → Users (with Supabase Auth)
```

### Component Architecture

#### ETL Pipeline (src/etl/)
- **run.ts**: Main orchestrator, coordinates all ETL stages
- **ingest/**: Airtable client, article fetching with field mapping
- **extract/**: Title analysis, regex patterns, LLM fallback, hybrid merger
- **normalize/**: Unit conversions, categorical mapping, QC validation
- **build/**: model_key generation, ShoeInput construction
- **upsert/**: Supabase writes with conflict handling

#### Specs DOM Pipeline (scripts/)
- **backfill-specs-dom.ts**: Variant 2: windowed deterministic extraction + shoe prefilter
- **specs-backfill-runner.ts**: Batch runner for DOM extraction with timeout management

#### Specs Resolver Pipeline (scripts/specs-pipeline/)
- **extractor.ts**: Keyword-windowed deterministic extraction with multi_table detection
- **resolver.ts**: Gated LLM resolver for ambiguous cases with merge-preserving updates
- **resolve-ambiguous-specs.ts**: Alternate/legacy resolver implementation
- **runner.ts**: Pipeline orchestration for extractor and resolver stages

#### Core Services (src/core/)
- **logger**: Structured logging with pino
- **metrics**: Pipeline execution metrics
- **validation**: Zod schemas for type safety
- **utils**: Common utilities, unit conversions

#### Integrations (src/integrations/)
- **airtable**: Client wrapper for Airtable API
- **supabase**: Client wrapper, RPC helpers

#### Web App (web-app/)
- **Next.js 14+**: App router, server components
- **Supabase Auth**: Authentication and authorization
- **Pages**: /login, /auth/callback, /, /approve, /search
- **Middleware**: Session validation, route protection

## Key Technical Decisions

### 1. Deterministic-First Extraction
**Decision**: Try regex/structured parsing before LLM  
**Rationale**: 
- Faster execution
- More predictable results
- Lower cost
- LLM as fallback provides coverage for edge cases

**Implementation**: 
- Title analysis determines extraction scenario
- Regex patterns for common structures
- LLM fallback when regex yields insufficient data
- Hybrid merge: keep numeric from regex, enrich text from LLM

### 2. Variant 2: Windowed Deterministic Extraction + Shoe Prefilter
**Decision**: Replace extraction worker timeout mechanism with deterministic windowed approach  
**Rationale**:
- Extraction worker timeout (EXTRACT_TIMEOUT_MS) produced 0 successful specs
- Windowed extraction completes quickly without external worker
- Prefilter reduces noise by filtering non-shoe articles early

**Implementation**:
```
1. Shoe Article Prefilter (isLikelyShoeArticle):
   - Strong anchor detection (heel-to-toe drop, drop + mm, etc.)
   - Weighted keyword scoring (high/medium/low categories)
   - Expanded negative keyword list

2. Windowing (buildKeywordWindows):
   - Finds keywords: drop, stack, heel, forefoot, weight, $, msrp, mm, oz, g
   - Creates windows ±4000 chars around each hit
   - Merges overlaps, caps total analyzed chars to 120k

3. Cluster-Based Resolution (December 2025 enhancement):
   - Snippet scoring (scoreSnippet): weights for weight/drop/stack/price patterns
   - Top snippet selection (selectTopSnippets): selects top N snippets by spec density
   - Cluster building (buildBestCluster): forms clusters from snippets with ≥2 spec groups
   - Proximity join: upgrades ambiguous_multi to single when unique cluster found

4. Safe Deterministic Extraction (extractSpecsFromWindows):
   - When multiple values detected, attempts cluster-based resolution
   - If unique cluster found: mode="single" with single_reason="proximity_join"
   - Otherwise: mode="ambiguous_multi" with top snippets as candidates
   - Three output modes: single, ambiguous_multi, skipped

5. Combined Results:
   - Multi-table detection takes precedence (when ≥2 models)
   - Cluster-based resolution reduces ambiguous_multi by ~10–15%
   - Windowed extraction used as fallback
   - Prefilter telemetry included in all specs_json
```

### 3. Gated LLM Resolver for Ambiguous Cases
**Decision**: Use LLM only for ambiguous cases that pass strict gate checks, with merge-preserving updates  
**Rationale**:
- LLM calls are expensive and should be used only when necessary
- Gate checks ensure sufficient signal exists before calling LLM
- Merge behavior preserves extraction context (candidates, raw_strings, telemetry) for debugging and future retries

**Implementation**:
```
1. Row Selection:
   - Processes rows where specs_json.mode = 'ambiguous_multi'
   - Also processes llm_gate_skipped rows when FORCE_LLM=1

2. Gate Checks (controlled by env vars):
   - LLM_GATE: enabled by default (set to '0' to disable)
   - LLM_MAX_CALLS: limit per run (default 200)
   - FORCE_LLM: bypass gate checks for retrying skipped rows

3. Skip Reasons (persisted in specs_json):
   - insufficient_signal: <2 non-null spec fields (price, weight, drop, heel, forefoot)
   - max_calls_exceeded: LLM call limit reached
   - no_candidates: no candidate snippets available

4. Critical Merge Rule:
   - Resolver never overwrites specs_json; merges success/failure patches into existing JSON
   - markFailure(id, reason, existingSpecsJson) merges failurePatch into existingSpecsJson
   - Success path merges parsedJson into specs plus resolved_by_meta and telemetry

5. Output Modes:
   - resolved: single model resolved
   - resolved_multi: multiple models resolved
   - ambiguous_multi: LLM could not resolve (kept for future retry)

6. Data Preservation:
   - Candidates and raw_strings from extractor are preserved
   - Prefilter telemetry remains intact
   - Only resolution-specific fields are added/updated
```

**Key Environment Variables**:
- `LLM_GATE=1` (enabled by default, set to "0" to disable)
- `LLM_MAX_CALLS=200` (maximum LLM calls per run)
- `FORCE_LLM=1` (bypasses all gate checks, allows retry of llm_gate_skipped rows)
- `FORCE_ID` (debug / force single row)
- `RESOLVER_MODEL=gpt-4o-mini` (LLM model for resolution)
- `RESOLVER_MAX_TOKENS=1000` (max tokens for LLM response)

**Current Status**:
- Deterministic extractor is active and writes results
- `mode="single"` has 25 rows, all with `price/drop/weight/stack`
- `not_shoe_article` prefilter working in principle: `dom_not_shoe = 6` with `avg_score ≈ 2.17`
- Cluster-based resolution implemented and TypeScript-verified

**Current Issues**:
1. **Prefilter missing for `large_html` rows**: 55 `skipped` rows have no prefilter data because prefilter is applied **after** the size guard
2. ~~**Positive score inflated by repetition**: Raw repetition (e.g., "running" 200x) makes long articles look like shoe articles~~ **FIXED**
3. ~~**Anchor flag too permissive**: Often becomes `true` for texts that are not real spec sections~~ **FIXED**

**Next Iteration Fixes**:
1. **Fix 1 – prefilter for `large_html`**:
   - Before size guard, take `text.slice(0, MAX_PREFILTER_CHARS)` (120k–200k)
   - Run prefilter on this slice
   - Always persist `prefilter_*` fields even if final mode is `large_html`

2. **Fix 2 – normalize the score**: ✅ **IMPLEMENTED**
   - For each positive keyword, use `min(count, CAP)` with `CAP = 3`
   - Sum capped counts for final positive score
   - Prevent repetition ("run" 200x) from dominating classification

3. **Fix 3 – stricter anchors with no auto‑pass**: ✅ **IMPLEMENTED**
   - Define `has_anchor` only for true spec anchors: combinations like `drop/stack/heel/forefoot + numbers/mm` or "heel-to-toe drop"
   - Do **not** auto‑pass on `has_anchor`; if `has_anchor` is `true` but `negativeScore` is high, classify as `NOT_SHOE`
   - Anchor bonus: +5 (does not auto-pass)

**Implementation Details**:
- **Positive/Negative caps**: 3 per term
- **Anchor bonus**: +5 (added to score, no auto-pass)
- **Base score threshold**: 8
- **Negative score threshold**: 6
- **Test suite**: `scripts/specs-pipeline/test-prefilter-fixes.ts` validates all fixes

**Cluster-Based Resolution Details**:
- **Environment variables**: `SNIPPET_TOP_N` (default 8), `DEBUG_SPEC_CLUSTER=1`
- **Scoring**: weight/drop/stack patterns (+2), price (+1), keyword anchors (+1)
- **Cluster requirements**: at least 2 spec groups (weight, drop, heel+forefoot, price)
- **Safety**: Only upgrades to single if no competing clusters within 10% score
- **Telemetry**: `snippet_top_n`, `snippet_scoring_enabled`, `cluster_score`, `cluster_sources`, `single_reason`

### 3. Canonical Normalization
**Decision**: Store all measurements in canonical units  
**Rationale**:
- Enables meaningful comparisons
- Simplifies filtering and sorting
- Reduces client-side conversion logic

**Standards**:
- Heights/drop: millimeters (mm)
- Weight: grams (g)
- Price: US dollars (USD)
- Breathability: low/medium/high/null
- Features: boolean (carbon_plate, waterproof)

### 4. Duplicate Prevention Strategy
**Decision**: Use model_key + composite unique constraint  
**Rationale**:
- model_key enables fast duplicate checks
- Composite constraint (airtable_id, brand_name, model) prevents per-article duplicates
- Allows same model from different articles

**Implementation**:
```typescript
model_key = normalize(brand + " " + model)
UNIQUE (airtable_id, brand_name, model)
```

### 5. Database-Only Schema Changes
**Decision**: All schema changes via SQL migrations  
**Rationale**:
- Version control for schema
- Auditability
- Rollback capability
- Explicit change tracking

**Pattern**:
1. Create migration SQL file
2. Test in dev environment
3. Apply via migration script
4. Update TypeScript types
5. Document in DATABASE_CHANGELOG.md

### 6. Monorepo with Integrated Web App
**Decision**: Convert web-app from submodule to regular directory  
**Rationale**:
- Single PR/commit for full-stack changes
- Simpler local development and CI/CD
- Faster feature development
- Reduced synchronization errors

## Design Patterns

### ETL Stage Pattern
Each ETL stage follows consistent interface:
```typescript
interface ETLStage<Input, Output> {
  process(input: Input): Promise<Output>
  validate?(output: Output): ValidationResult
}
```

### Service Pattern
All external integrations wrapped in service classes:
```typescript
class AirtableService {
  private client: Airtable
  
  async fetchArticles(options): Promise<Article[]> {
    // Implementation with error handling
  }
}
```

### Configuration Pattern
Environment-driven configuration:
```typescript
const config = {
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}
```

### Error Handling Pattern
Structured error handling with logging:
```typescript
try {
  const result = await operation()
  return result
} catch (error) {
  logger.error({ error, context }, 'Operation failed')
  throw new Error(`Operation failed: ${error.message}`)
}
```

## Component Relationships

### ETL Pipeline Dependencies
```
run.ts
  ├─→ ingest/from_airtable.ts (AirtableService)
  ├─→ extract/orchestrator.ts
  │     ├─→ extract/title-analysis.ts
  │     ├─→ extract/regex-extractor.ts
  │     └─→ extract/llm-extractor.ts (OpenAI)
  ├─→ normalize/fields.ts
  │     └─→ core/utils/units.ts
  ├─→ build/shoe-builder.ts
  └─→ upsert/to_supabase.ts (SupabaseService)
```

### Specs DOM Pipeline Dependencies
```
specs-backfill-runner.ts
  └─→ backfill-specs-dom.ts
        ├─→ DOM parsing (Worker thread)
        ├─→ Shoe prefilter (isLikelyShoeArticle)
        ├─→ Windowing (buildKeywordWindows)
        └─→ Extraction (extractSpecsFromWindows)
```

### Web App Dependencies
```
web-app/
  ├─→ middleware.ts (session validation)
  ├─→ src/app/
  │     ├─→ login/page.tsx
  │     ├─→ auth/callback/route.ts
  │     ├─→ page.tsx (staging view)
  │     ├─→ approve/page.tsx
  │     └─→ search/page.tsx
  └─→ lib/
        ├─→ supabase.ts (client creation)
        └─→ auth.ts (auth helpers)
```

## Critical Implementation Paths

### Path 1: Article Processing
1. Fetch article from Airtable
2. Analyze title for extraction scenario
3. Apply regex patterns
4. Check if data sufficient, else call LLM
5. Merge results (hybrid strategy)
6. Normalize fields
7. Build ShoeInput with model_key
8. Upsert to Supabase with conflict handling

### Path 2: Specs DOM Extraction
1. Fetch article HTML (with timeout)
2. Check HTML size guard (skip if >600k)
3. Parse DOM with Worker thread (multi-table detection)
4. Run shoe article prefilter
5. Build keyword windows around spec keywords
6. Extract specs from windows (deterministic regex)
7. Combine results (multi-table takes precedence)
8. Update Supabase with specs_json + prefilter telemetry

### Path 3: Staging to Approval
1. User views staging table (server-side fetch)
2. User approves item
3. Validate date format (YYYY-MM-DD or NULL)
4. Move from staging to production table
5. Delete from staging
6. Update UI

### Path 4: Search Flow
1. User enters search criteria (brand, model, features)
2. Build query with case-insensitive brand filter
3. Apply feature filters (waterproof, carbon_plate, breathability)
4. Execute server-side query
5. Return results to client
6. Optional: export filtered results

## Data Models

### Core Entity: ShoeInput
```typescript
interface ShoeInput {
  airtable_id: string
  brand_name: string
  model: string
  model_key: string
  source_article_date?: string
  source_link?: string
  
  // Measurements (canonical units)
  forefoot_height_mm?: number
  heel_height_mm?: number
  drop_mm?: number
  weight_g?: number
  price_usd?: number
  
  // Features
  carbon_plate?: boolean
  waterproof?: boolean
  upper_breathability?: 'low' | 'medium' | 'high'
  
  // Descriptive
  upper_material?: string
  midsole_stack?: string
  outsole_type?: string
  fit_notes?: string
  features?: string
}
```

### Specs JSON Structure
```typescript
interface SpecsJson {
  mode: 'single' | 'ambiguous_multi' | 'multi_table' | 'skipped'
  price_usd?: number | null
  drop_mm?: number | null
  weight_g?: number | null
  heel_mm?: number | null
  forefoot_mm?: number | null
  raw_strings?: Record<string, string | undefined>
  candidates?: any
  requires_llm_resolution?: boolean
  reason?: string
  window_telemetry?: any
  table_match_confidence?: number
  models?: Array<any>
  source_labels_found?: string[]
  
  // Prefilter telemetry (present for all modes)
  prefilter_score: number
  prefilter_has_anchor: boolean
  prefilter_pos_hits: string[]  // max 5
  prefilter_neg_hits: string[]  // max 5
}
```

### Staging vs Production
- Staging: Review and approval workflow
- Production: Approved, searchable data
- Same schema, separate tables
- RLS policies control access

## Performance Considerations

### Extraction Optimization
- Regex first (fast, deterministic)
- LLM only when necessary (cost/latency)
- Batch processing with limits
- Windowed extraction reduces processing volume
- Per-article caching planned

### Database Optimization
- Indexes on frequently queried fields
- GIN indexes for JSONB fields
- Composite indexes for unique constraints
- Views for complex queries

### Upsert Strategy
- Bounded concurrency (p-queue)
- Batch operations
- Conflict handling with ON CONFLICT
- Connection pooling via Supabase client

## Security Patterns

### Authentication
- Supabase Auth for user management
- Session-based authentication
- Middleware for route protection
- Secure cookie handling (sameSite, secure flags)

### Authorization
- Row Level Security (RLS) policies
- Service role only for server-side operations
- Read-only policies for search
- Write policies for staging/approval

### Environment Security
- No committed .env files
- Separate dev/staging/production configs
- API keys in environment variables
- Client-side uses anon key only
