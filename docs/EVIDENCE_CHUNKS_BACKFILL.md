# Evidence Chunks Backfill

## Overview

The evidence chunks backfill job populates the `evidence_chunks` and `evidence_chunk_models` tables with text chunks from articles, linked to shoe models with embeddings for semantic search.

## Architecture

### Tables

#### `public.evidence_chunks`
Stores text chunks from articles with vector embeddings:
- `chunk_id` (UUID, primary key)
- `source_link` (TEXT, article URL)
- `article_id_int` (BIGINT, article ID)
- `source_title` (TEXT, article title)
- `chunk_type` (TEXT, one of: 'review', 'comparison', 'other')
- `chunk_text` (TEXT, the actual chunk content)
- `chunk_hash` (TEXT, SHA256 hash for deduplication)
- `embedding` (vector(1536), OpenAI embedding)
- `created_at` (TIMESTAMPTZ)

Unique constraint: `(source_link, chunk_hash)`

#### `public.evidence_chunk_models`
Links chunks to shoe models with confidence scores:
- `chunk_id` (UUID, references evidence_chunks)
- `id_model` (UUID, references shoe_results.id)
- `match_confidence` (INTEGER, 0-100)
- `created_at` (TIMESTAMPTZ)

Primary key: `(chunk_id, id_model)`

### Data Flow

1. **Fetch articles** from `JazzItJog_db` with non-empty `Content`
2. **Fetch models** for each article from `shoe_results`:
   - Join by `article_id_int` (preferred)
   - Fallback to `source_link` if no ID match
3. **Generate chunks** using intelligent segmentation:
   - Build model aliases (brand+model, unique model names)
   - Find anchor points (model mentions in text)
   - Create segments between anchors
   - Split segments into 200-600 char chunks
4. **Attach models** to chunks based on rules:
   - **Comparison** (2+ models mentioned): confidence=100
   - **Review** (1 model mentioned): confidence=100
   - **Other** (within 1200 chars of anchor, no other mentions): confidence=60
5. **Generate embeddings** using OpenAI API (batched)
6. **Upsert chunks** with deduplication by hash
7. **Insert links** to `evidence_chunk_models`

## Setup

### Prerequisites

1. **Database migration**: Apply the migration to create tables:
   ```bash
   # Using Supabase CLI (if available)
   supabase db push
   
   # Or manually via psql/SQL editor
   # Run: supabase/migrations/010_create_evidence_tables.sql
   ```

2. **Environment variables**: Add to your `.env` file:
   ```bash
   # Required
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   
   # Optional (defaults shown)
   EMBED_PROVIDER=openai
   EMBED_MODEL=text-embedding-3-small
   EMBED_DIMENSIONS=1536
   ```

### Verify Setup

Check that tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('evidence_chunks', 'evidence_chunk_models');
```

## Usage

### Basic Commands

```bash
# Dry run with 5 articles (no DB writes)
pnpm backfill:evidence -- --dry-run --limit-articles 5

# Process 10 articles
pnpm backfill:evidence -- --limit-articles 10

# Process all articles
pnpm backfill:evidence

# Process articles starting from ID 100
pnpm backfill:evidence -- --since-article-id-int 100

# Custom batch sizes
pnpm backfill:evidence -- --batch-size 5 --embed-batch-size 32
```

### CLI Options

- `--dry-run`: Run without writing to database (for testing)
- `--limit-articles N`: Process only N articles
- `--since-article-id-int X`: Process articles with ID >= X
- `--batch-size N`: Process N articles per batch (default: 10)
- `--embed-batch-size N`: Generate N embeddings per API call (default: 64)
- `--help`: Show help message

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Service role key for admin access |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for embeddings |
| `EMBED_PROVIDER` | No | `openai` | Embedding provider (currently only OpenAI) |
| `EMBED_MODEL` | No | `text-embedding-3-small` | OpenAI embedding model |
| `EMBED_DIMENSIONS` | No | `1536` | Embedding vector dimensions |

## Chunking Strategy

### Model Alias Generation

For each model in an article:
- Always include: `"${brand_name} ${model}"` (case-insensitive)
- Include model name alone ONLY if unique within the article

Example:
- Article has: Nike Pegasus 40, Adidas Boston 12
- Aliases: `["nike pegasus 40", "pegasus 40", "adidas boston 12", "boston 12"]`

### Segmentation

1. Find all anchor points (model mentions) in content
2. Create segments from each anchor to the next different model's anchor
3. Cap segment length at 2000 chars
4. Split segments into chunks (200-600 chars), preferring paragraph boundaries

### Attachment Rules

| Condition | chunk_type | Confidence | Rule |
|-----------|------------|------------|------|
| 2+ models explicitly mentioned | `comparison` | 100 | Attach to all mentioned models |
| 1 model explicitly mentioned | `review` | 100 | Attach to that model |
| No explicit mention, within 1200 chars of anchor | `other` | 60 | Attach to segment's model |
| No explicit mention, >1200 chars from anchor | - | - | Skip (no attachment) |

### Deduplication

Chunks are deduplicated using SHA256 hash of normalized text:
- Normalization: trim + collapse whitespace to single spaces
- Unique constraint: `(source_link, chunk_hash)`
- On conflict: reuse existing `chunk_id`

## Monitoring

### Progress Logs

The script logs progress at multiple levels:
- Article batch progress
- Chunk generation counts
- Embedding batch progress
- Insert/conflict statistics

### Final Statistics

At completion, the script reports:
```json
{
  "articlesProcessed": 150,
  "articlesSkipped": 12,
  "chunksCreated": 450,
  "chunksReused": 23,
  "linksCreated": 520,
  "errors": 2
}
```

### Common Issues

**No models found for article**
- Article has no entries in `shoe_results`
- Check `article_id_int` and `source_link` mappings

**Embedding API errors**
- Rate limit (429): Script includes 200ms delay between batches
- Invalid API key: Check `OPENAI_API_KEY` in `.env`
- Quota exceeded: Check OpenAI account usage

**Database conflicts**
- Chunks are safely deduplicated by hash
- Links use `ON CONFLICT DO NOTHING`

## Cost Estimation

### OpenAI Embeddings

Model: `text-embedding-3-small`
- Cost: ~$0.02 per 1M tokens
- Average chunk: ~100 tokens
- 1000 chunks ≈ 100k tokens ≈ $0.002

Example:
- 200 articles × 10 chunks/article = 2000 chunks
- Estimated cost: ~$0.004

### Recommendations

1. Start with `--dry-run --limit-articles 5` to verify logic
2. Process in batches: `--limit-articles 50` at a time
3. Monitor OpenAI usage dashboard
4. Use `--since-article-id-int` to resume if interrupted

## Extending the System

### Adding New Embedding Providers

1. Implement the `Embedder` interface in `src/etl/backfill/embedder.ts`:
   ```typescript
   export class MyEmbedder implements Embedder {
     async embed(texts: string[]): Promise<number[][]> {
       // Your implementation
     }
   }
   ```

2. Add to factory in `createEmbedder()`:
   ```typescript
   case 'myprovider':
     return new MyEmbedder({ /* config */ });
   ```

3. Set environment variable:
   ```bash
   EMBED_PROVIDER=myprovider
   ```

### Customizing Chunking

Edit `src/etl/backfill/chunker.ts`:
- Adjust `MIN_CHUNK` / `MAX_CHUNK` constants
- Modify segmentation logic in `buildSegments()`
- Change attachment rules in `processArticleContent()`

## Troubleshooting

### TypeScript Errors

```bash
# Check types
pnpm type-check

# Build
pnpm build
```

### Database Connection

```bash
# Test connection (requires psql)
psql $SUPABASE_URL -c "SELECT 1"

# Or use Supabase client in Node
node -e "require('dotenv/config'); console.log(process.env.SUPABASE_URL)"
```

### Dry Run Verification

Always test with dry run first:
```bash
pnpm backfill:evidence -- --dry-run --limit-articles 3
```

Check logs for:
- Articles fetched
- Models found per article
- Chunks generated
- Embeddings created (simulated)

## Performance

### Benchmarks (approximate)

- Article fetch: ~100-500ms per batch
- Chunking: ~10-50ms per article
- Embedding generation: ~500-1000ms per batch (64 chunks)
- Database insert: ~50-200ms per chunk

### Optimization Tips

1. **Batch size**: Increase `--batch-size` for faster processing (default: 10)
2. **Embed batch size**: Increase `--embed-batch-size` for fewer API calls (default: 64, max: 2048)
3. **Parallel processing**: Currently sequential; could parallelize article processing
4. **Caching**: Consider caching embeddings for identical chunks across runs

## Maintenance

### Re-running the Backfill

The script is idempotent:
- Chunks are deduplicated by hash
- Links use `ON CONFLICT DO NOTHING`
- Safe to re-run on same articles

### Incremental Updates

Process only new articles:
```bash
# Get max article ID from last run
MAX_ID=$(psql $SUPABASE_URL -t -c "SELECT MAX(article_id_int) FROM evidence_chunks")

# Process articles after that ID
pnpm backfill:evidence -- --since-article-id-int $((MAX_ID + 1))
```

### Cleanup

Remove chunks for specific articles:
```sql
DELETE FROM evidence_chunks WHERE article_id_int = 123;
-- Cascade deletes links in evidence_chunk_models
```

## References

- Migration: `supabase/migrations/010_create_evidence_tables.sql`
- Embedder: `src/etl/backfill/embedder.ts`
- Chunker: `src/etl/backfill/chunker.ts`
- Main script: `src/etl/backfill/backfill_evidence_chunks.ts`
- Package script: `package.json` → `backfill:evidence`
