# Tech Context: Sneaker Pipeline

## Technologies Used

### Core Stack
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.2+
- **Package Manager**: pnpm (primary), npm (supported)

### Backend/ETL
- **Airtable SDK**: v0.12.2 - Source data integration
- **Supabase JS**: v2.74.0 - PostgreSQL client & auth
- **OpenAI SDK**: v4.104.0 - LLM extraction fallback
- **Zod**: v3.22.0 - Runtime type validation
- **pino**: v10.0.0 - Structured logging
- **dayjs**: v1.11.0 - Date manipulation
- **p-queue**: v8.0.0 - Concurrency control
- **fast-csv**: v5.0.0 - CSV export
- **lodash**: v4.17.0 - Utility functions

### Frontend (web-app/)
- **Framework**: Next.js 14+ (App Router)
- **React**: 18+
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **TypeScript**: Full type safety

### Testing
- **Framework**: Vitest v3.2.4
- **Test Types**: Unit and integration tests
- **Coverage**: Tests in `tests/` directory

### Development Tools
- **tsx**: TypeScript execution
- **pino-pretty**: Development log formatting
- **TypeScript Compiler**: Type checking and builds

## Development Setup

### Prerequisites
```bash
# Required
Node.js 20.x
npm or pnpm

# Optional but recommended
Visual Studio Code
Git
```

### Environment Variables
Required in `.env` or `.env.local`:

```bash
# Airtable
AIRTABLE_API_KEY=key***
AIRTABLE_BASE_ID=app***
AIRTABLE_TABLE_NAME=Articles

# Supabase
SUPABASE_URL=https://***.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ***
SUPABASE_ANON_KEY=eyJ***

# OpenAI
OPENAI_API_KEY=sk-***

# Optional: ETL Configuration
UPSERT_CONCURRENCY=5
ETL_MODE=staging|production
```

### Installation
```bash
# Install dependencies
pnpm install  # or npm install

# Copy environment template
cp .env.example .env.local

# Fill in actual keys in .env.local
```

### Running the Project

#### ETL Pipeline
```bash
# Full pipeline run (production mode)
pnpm etl:run

# Staging run (write to staging tables)
pnpm etl:staging

# CLI with options
pnpm sync -- --limit=100 --dry-run --upsert-concurrency=8

# Development mode
pnpm dev
```

#### Web Application
```bash
cd web-app
pnpm install
pnpm dev  # Runs on http://localhost:3000
```

#### Testing
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Specific test suites
pnpm test:unit
pnpm test:integration

# Type checking
pnpm type-check
```

## Technical Constraints

### API Limits
- **Airtable**: 5 requests/second per base
- **OpenAI**: Rate limits vary by tier
- **Supabase**: Connection pooling limits

### Data Constraints
- **Max files per article**: Flexible, limited by processing time
- **Article content size**: HTML/text from Airtable
- **Database field sizes**: Per PostgreSQL limits

### Performance
- **ETL batch size**: Configurable via --limit
- **Upsert concurrency**: Default 5, configurable via UPSERT_CONCURRENCY
- **LLM calls**: Minimized via regex-first approach

## Dependency Management

### Critical Dependencies
These are core to the system and changes require careful testing:
- `@supabase/supabase-js` - Database & auth
- `airtable` - Source data
- `openai` - AI extraction
- `zod` - Type validation

### Version Strategy
- **Lock files**: Committed (package-lock.json, pnpm-lock.yaml)
- **Updates**: Test thoroughly before updating major versions
- **Security**: Use `npm audit` / `pnpm audit` regularly

## Tool Usage Patterns

### TypeScript
```typescript
// Strict mode enabled
"strict": true
"noEmit": true  // For type checking
"skipLibCheck": true
```

### Logging
```typescript
import { logger } from './core/logger'

logger.info({ context: 'value' }, 'Message')
logger.error({ error, context }, 'Error occurred')
```

### Validation
```typescript
import { z } from 'zod'

const schema = z.object({
  field: z.string().min(1)
})

const validated = schema.parse(data)
```

### Database Queries
```typescript
// Using Supabase client
const { data, error } = await supabase
  .from('shoe_results')
  .select('*')
  .eq('brand_name', brand)
  .order('created_at', { ascending: false })
```

### Environment Config
```typescript
// Centralized configuration
import { config } from './config'

// Access values
const apiKey = config.airtable.apiKey
```

## Build & Deployment

### Build Process
```bash
# TypeScript compilation
pnpm build  # Output to dist/

# Type checking (no output)
pnpm type-check
```

### Deployment Considerations
- **Environment**: Separate .env files per environment
- **Migrations**: Apply to database before deploying code
- **Secrets**: Never commit .env files
- **Web App**: Deploy via Vercel or similar (Next.js optimized)

## IDE Configuration

### VS Code Settings (Recommended)
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Extensions (Recommended)
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense (for web-app)

## Database Technology

### Supabase (PostgreSQL)
- **Version**: PostgreSQL 15+
- **Features Used**:
  - Row Level Security (RLS)
  - JSONB columns with GIN indexes
  - Composite unique constraints
  - Views and RPC functions
  - Connection pooling

### Migration Pattern
```javascript
// Separate RPC calls, no transactions
const { error } = await supabase.rpc('exec_sql', {
  sql: 'ALTER TABLE...'
})
```

## Development Workflow

### Code Organization
```
src/
  core/       - Shared utilities, logger, metrics
  etl/        - Pipeline stages
  integrations/ - External service clients
  cli/        - Command-line interface

web-app/
  src/app/    - Next.js pages and routes
  lib/        - Shared utilities
  migrations/ - SQL migrations (to be moved)
```

### Git Workflow
- Feature branches for new work
- Descriptive commit messages
- Test before committing
- Update documentation with changes

### Quality Gates
Before merging:
1. `pnpm type-check` passes
2. `pnpm test` passes
3. Manual testing completed
4. Documentation updated
5. No console errors

## Troubleshooting

### Common Issues

#### "Module not found"
```bash
rm -rf node_modules
rm package-lock.json
pnpm install
```

#### "Type errors after DB change"
1. Update database types in `src/lib/supabase.ts`
2. Run `pnpm type-check`
3. Fix any remaining errors

#### "Connection refused" (Supabase)
- Check SUPABASE_URL and keys in .env
- Verify network connection
- Check Supabase dashboard status

#### "Rate limit exceeded" (OpenAI)
- Reduce batch size with --limit
- Add delays between LLM calls
- Check OpenAI dashboard for limits

### Debug Commands
```bash
# Check Node version
node --version

# Check installed packages
pnpm list

# View logs
pnpm etl:run 2>&1 | pnpm exec pino-pretty

# Database connection test
psql $SUPABASE_URL
```

## Security Best Practices

### Environment Variables
- Never commit .env files
- Use .env.example as template
- Rotate keys periodically
- Use different keys per environment

### API Keys
- Service role key: Server-side only
- Anon key: Client-side safe
- OpenAI key: Server-side only
- Airtable key: Server-side only

### Code Security
- Input validation with Zod
- SQL injection prevention (parameterized queries)
- XSS prevention (React escaping)
- CSRF protection (Supabase Auth)
