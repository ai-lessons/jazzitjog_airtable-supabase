# Active Context: Sneaker Pipeline

## Current Work Focus

### Recently Completed (October 2025)
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
