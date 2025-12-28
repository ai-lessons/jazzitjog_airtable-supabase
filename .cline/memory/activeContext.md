# Active Context: Sneaker Pipeline

## Current Work Focus

### Specs DOM Pipeline - Variant 2 Implementation (December 2025)
**Windowed Deterministic Extraction + Shoe Prefilter**
- **Successfully implemented**: Replaced extraction worker timeout mechanism with deterministic windowed approach
- **Key components**:
  1. **Shoe article prefilter**: `isLikelyShoeArticle()` with anchor detection and weighted keyword scoring
  2. **Windowing**: `buildKeywordWindows()` creates windows around spec keywords (±4000 chars, max 120k total)
  3. **Cluster-based resolution**: `scoreSnippet()`, `selectTopSnippets()`, `buildBestCluster()` for proximity join
  4. **Safe deterministic extraction**: `extractSpecsFromWindows()` with cluster resolution for ambiguous cases
  5. **Combined results**: Multi-table detection takes precedence, cluster resolution reduces ambiguous_multi

**Current Status**:
- ✅ Deterministic extractor active and writing results: `mode="single"` has 25 rows with complete specs (`price/drop/weight/stack`)
- ✅ `not_shoe_article` prefilter working in principle: `dom_not_shoe = 6` rows with `avg_score ≈ 2.17`
- ✅ **Cluster-based resolution implemented**: New snippet scoring, top snippet selection, and cluster building logic added
- ✅ **Environment variables**: `SNIPPET_TOP_N` (default 8), `DEBUG_SPEC_CLUSTER=1` for detailed logging
- ✅ **New telemetry fields**: `snippet_top_n`, `snippet_scoring_enabled`, `cluster_score`, `cluster_sources`, `single_reason`
- ✅ Prefilter telemetry included in all `specs_json`: `prefilter_score`, `prefilter_has_anchor`, `prefilter_pos_hits`, `prefilter_neg_hits`
- ✅ Safe logging: No HTML or long text in logs, only structured metadata
- ✅ TypeScript compilation verified: All changes type-safe

**Cluster-Based Resolution Details**:
- **Goal**: Reduce `ambiguous_multi` by ~10–15% without using LLM
- **Scoring**: Weight patterns (g/oz) +2, drop/stack patterns (mm) +2, price ($) +1, keyword anchors +1
- **Cluster requirements**: At least 2 spec groups (weight, drop, heel+forefoot, price)
- **Safety**: Only upgrades to `single` if unique cluster found (no competing clusters within 10% score)
- **Debug**: `DEBUG_SPEC_CLUSTER=1` logs top snippets, scores, and cluster analysis for one row

**Current Issues Identified**:
1. **Prefilter missing for `large_html` rows**: 55 `skipped` rows have no prefilter data because prefilter is applied **after** the size guard
2. **Positive score inflated by repetition**: Raw repetition (e.g., "running" 200x) makes long articles look like shoe articles
3. **Anchor flag too permissive**: Often becomes `true` for texts that are not real spec sections

**Immediate Next Steps (Fix 1, 2, 3)**:
1. **Fix 1 – prefilter for `large_html`**:
   - Before size guard, take `text.slice(0, MAX_PREFILTER_CHARS)` (120k–200k)
   - Run prefilter on this slice, always persist `prefilter_*` fields even if final mode is `large_html`

2. **Fix 2 – normalize the score**:
   - For each positive keyword, use `min(count, CAP)` with `CAP ≈ 3–5`
   - Sum capped counts for final positive score, prevent repetition domination

3. **Fix 3 – stricter anchors with no auto‑pass**:
   - Define `has_anchor` only for true spec anchors: combinations like `drop/stack/heel/forefoot + numbers/mm` or "heel-to-toe drop"
   - Do **not** auto‑pass on `has_anchor`; if `has_anchor` is `true` but `negativeScore` is high, classify as `NOT_SHOE`

**Verification Plan for Cluster Resolution**:
- Re-run pipeline with same dataset (including ID=17)
- Collect SQL metrics "before/after" for: `single`, `ambiguous_multi`, `dom_not_shoe`, `large_html`, prefilter coverage
- Verify: Number of meaningful `single` specs does not drop, `not_shoe_article` grows where appropriate

**Verification Plan**:
- Re-run pipeline on same dataset (including ID=17) and collect SQL metrics "before/after" for:
  - `single`, `ambiguous_multi`, `dom_not_shoe`, `large_html`, and prefilter coverage
- Verify that:
  - Number of meaningful `single` specs does not drop
  - `not_shoe_article` grows where it should (especially among previous `large_html`)
  - Prefilter coverage and score distribution make sense

**Previously (October 2025)**
**Web-App Submodule Conversion**
- Converted `web-app/` from Git submodule to regular directory in main repository
- Rationale: Simplified development workflow, single PR/commit for full-stack changes
- Result: 82 files added to main repository with full commit history

**Authentication & Session Fixes**
- Fixed cookie handling in development environment
- Set `secure=false` and `sameSite=lax` for dev mode
- Session persistence now working correctly
- Login flow: `/login` → `/auth/callback` → `/` (or `/approve`)

**Approval Workflow Enhancements**
- Normalized date handling: accepts YYYY-MM-DD format or NULL
- Fixed date column issues in staging approval
- Prevented crashes on invalid date formats
- Smooth data transfer from staging to production

**Search Feature Improvements**
- Implemented case-insensitive brand filtering
- Fixed brand search (e.g., "Puma" matches regardless of case)
- Using `ilike` operator for PostgreSQL queries
- Improved user experience with flexible search

**ETL/CLI Configuration**
- Added `--upsert-concurrency` parameter to CLI
- Parameterized concurrent upsert operations
- Default concurrency: 5 (configurable)
- Environment variable: `UPSERT_CONCURRENCY`

## Recent Changes (Git Commit History)

### Latest Commit (4237279)
```
chore(repo): convert web-app from submodule; finalize auth/approve/search fixes; ETL/CLI concurrency + docs/env

- Removed submodule linkage
- Integrated web-app as regular directory
- Auth: Fixed cookie handling for dev mode
- Approve: Normalized date handling (YYYY-MM-DD/NULL)
- Search: Case-insensitive brand filtering
- ETL: Parameterized upsert concurrency
- Docs: Updated environment setup guides
```

## Next Steps

### Immediate Priorities
1. **News Feature** (mentioned in terminal output)
   - Add news_items table with RLS
   - Create "News" tab in web interface
   - Schema: id, title, url, summary, published_at, created_at
   - Indexes on published_at desc

2. **Migration Organization**
   - Move `web-app/migrations/*` to `supabase/migrations/`
   - Formalize migration workflow
   - Update documentation

3. **Testing & Validation**
   - Verify login/session flow works consistently
   - Test staging approval with various date formats
   - Validate search with multiple brands
   - Check ETL concurrency performance

### Medium-Term Goals
1. **Batch Upsert Optimization**
   - Implement p-queue for bounded concurrency
   - Better created/updated detection
   - Performance metrics

2. **LLM Hygiene**
   - Request throttling
   - Exponential backoff
   - Per-article caching
   - Cost tracking

3. **Code Cleanup**
   - Remove legacy `record_id` references
   - Consolidate test files
   - Update TypeScript types

## Active Decisions & Considerations

### Architecture Decisions
- **Monorepo Structure**: Confirmed - web-app now integrated, not submodule
- **Staging Workflow**: Keep separate staging/production tables with RLS
- **Auth Strategy**: Supabase Auth with session-based cookies
- **Search Implementation**: Server-side queries with case-insensitive matching

### Technical Debt
- Migration files still in `web-app/migrations/` (should be in `supabase/migrations/`)
- Some test files at project root (should be in `tests/`)
- Legacy `record_id` references in some scripts
- Multiple debug/check scripts could be consolidated

### Performance Considerations
- Upsert concurrency now configurable (good)
- LLM calls need throttling/caching (planned)
- Database indexes in place for common queries (good)
- Consider adding more comprehensive error handling

## Important Patterns & Preferences

### Development Workflow
1. Read Memory Bank files at task start
2. Make incremental changes with testing
3. Update documentation after significant changes
4. Use descriptive commit messages
5. Test before pushing

### Code Style
- TypeScript strict mode
- Zod for runtime validation
- Structured logging with pino
- Error handling with try-catch and logging
- Environment-driven configuration

### Database Changes
- Always use SQL migrations
- Test in dev before production
- Update TypeScript types
- Document in DATABASE_CHANGELOG.md
- No direct schema changes via ORM

### Git Practices
- Feature branches for new work
- Meaningful commit messages
- Single commit per logical change
- Push to origin after testing
- Keep commits focused

## Learnings & Project Insights

### What Works Well
1. **Hybrid Extraction**: Regex-first approach with LLM fallback provides good balance of speed and coverage
2. **Modular ETL**: Clean separation of stages makes testing and debugging easier
3. **TypeScript**: Catches errors early, improves code quality
4. **Supabase**: Excellent developer experience with RLS and auth

### Challenges Overcome
1. **Submodule Complexity**: Converted to monorepo for simpler development
2. **Cookie Issues**: Resolved with environment-aware secure flag
3. **Date Handling**: Normalized to accept both formatted dates and NULL
4. **Case Sensitivity**: Fixed with PostgreSQL ilike operator

### Areas for Improvement
1. **LLM Cost Management**: Need better caching and throttling
2. **Test Coverage**: Could expand integration tests
3. **Documentation**: Keep Memory Bank and existing docs in sync
4. **Migration Workflow**: Formalize and centralize

### Best Practices Established
- Documentation-first approach (CLAUDE.md, PROJECT_ARCHITECTURE.md, etc.)
- Migration-only database changes
- Type safety throughout
- Comprehensive logging
- Server-side data operations for security

## Current Environment State
- **Mode**: ACT MODE (full tool access)
- **Location**: h:\sneaker-pipeline
- **Working Directory**: Clean after recent commit
- **Git Status**: Up to date with origin/main (commit 4237279)
- **Memory Bank**: Just initialized (this session)
