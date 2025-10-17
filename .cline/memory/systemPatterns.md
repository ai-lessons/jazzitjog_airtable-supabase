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

### 2. Canonical Normalization
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

### 3. Duplicate Prevention Strategy
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

### 4. Database-Only Schema Changes
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

### 5. Monorepo with Integrated Web App
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

### Path 2: Staging to Approval
1. User views staging table (server-side fetch)
2. User approves item
3. Validate date format (YYYY-MM-DD or NULL)
4. Move from staging to production table
5. Delete from staging
6. Update UI

### Path 3: Search Flow
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
