# Specs Pipeline Workflow

## Overview

The Specs Pipeline is a two-stage system for extracting and resolving shoe specifications from article content:

```
Stage 1: Keyword-Windowed Specs Extraction
└── Extract specs deterministically from article content
└── Output: specs_json with mode=single or mode=ambiguous_multi (with candidates)

Stage 2: LLM Resolver
└── Resolve ambiguous cases using LLM with strict gating
└── Output: Updated specs_json with resolved specs (preserving input data)
```

## Stage 1: Keyword-Windowed Specs Extraction

**Primary File:** `scripts/specs-pipeline/extractor.ts`

### Algorithm Flow

```
1. Title Prefilter
   └── Function: `titlePrefilter()`
   └── Filters non-shoe articles based on title keywords
   └── Early skip for articles about headphones, watches, bottles, etc.

2. Source Selection
   └── Uses article's "Content" field if ≥2000 chars
   └── Falls back to fetching HTML if content is short/missing

3. Lightweight Prefilter (HTML path only)
   └── Function: `extractLightweightText()`
   └── Extracts first 160k chars for quick prefiltering
   └── Prevents full DOM parsing for obviously non-shoe articles

4. DOM Parsing (Worker thread)
   └── Function: `parseDomWithWorker()`
   └── Timeout: 5000ms (DOM_PARSE_TIMEOUT_MS)
   └── Multi-table detection for comparing multiple shoe models

5. Shoe Article Prefilter
   └── Function: `isLikelyShoeArticle()`
   └── Anchor detection: "heel-to-toe drop", "drop X mm", "stack height"
   └── Weighted keyword scoring with negative keyword filtering
   └── Output: { ok: boolean, score: number, has_anchor: boolean }

6. Windowing
   └── Function: `buildKeywordWindows()`
   └── Keywords: drop, stack, heel, forefoot, weight, $, msrp, mm, oz, g
   └── Window radius: 4000 chars (WINDOW_RADIUS)
   └── Max total chars: 120k (MAX_WINDOW_TOTAL_CHARS)
   └── Merges overlapping windows

7. Deterministic Extraction
   └── Function: `extractSpecsFromWindows()`
   └── Regex patterns for price, drop, weight, heel, forefoot
   └── Cluster-based resolution for ambiguous cases
   └── Snippet scoring and selection (SNIPPET_TOP_N=8)

8. Output Modes
   └── `mode=single`: Unique specs found (price, drop, weight, heel, forefoot)
   └── `mode=ambiguous_multi`: Multiple conflicting values found
   └── `mode=multi_table`: Comparison table of 2+ models detected
   └── `mode=skipped`: Not a shoe article or no specs found
```

### Cluster-Based Resolution (December 2025 Enhancement)

When multiple conflicting values are detected:
1. **Score snippets** by spec density (weight/drop/stack/price patterns)
2. **Select top N snippets** (default 8) by score
3. **Build best cluster** from snippets with ≥2 spec groups
4. **If unique cluster found**: Upgrade to `mode=single` with `single_reason="proximity_join"`
5. **Otherwise**: Keep `mode=ambiguous_multi` with snippets as candidates

### Specs JSON Structure (Extractor Output)

```json
{
  "mode": "single" | "ambiguous_multi" | "multi_table" | "skipped",
  "price_usd": number | null,
  "drop_mm": number | null,
  "weight_g": number | null,
  "heel_mm": number | null,
  "forefoot_mm": number | null,
  
  // For ambiguous_multi mode:
  "requires_llm_resolution": true,
  "candidates": {
    "price_snippets": string[],
    "drop_snippets": string[],
    "weight_snippets": string[],
    "heel_snippets": string[],
    "forefoot_snippets": string[]
  },
  
  // Raw extraction context (preserved for debugging)
  "raw_strings": {
    "price_snippet": string,
    "drop_snippet": string,
    "weight_snippet": string,
    "heel_snippet": string,
    "forefoot_snippet": string
  },
  
  // Telemetry
  "prefilter_score": number,
  "prefilter_has_anchor": boolean,
  "prefilter_pos_hits": string[],
  "prefilter_neg_hits": string[],
  "window_telemetry": {
    "price_found": boolean,
    "drop_found": boolean,
    "weight_found": boolean,
    "heel_found": boolean,
    "forefoot_found": boolean
  },
  
  // Cluster resolution telemetry (if applicable)
  "snippet_top_n": 8,
  "snippet_scoring_enabled": true,
  "cluster_score": number,
  "cluster_sources": number[],
  "single_reason": "proximity_join" | "unique_drop_and_heel_with_multiple_weights"
}
```

## Stage 2: LLM Resolver

**Primary Files:**
- `scripts/specs-pipeline/resolver.ts` (main resolver)
- `scripts/resolve-ambiguous-specs.ts` (alternate implementation)

### When It Runs

The resolver processes rows where:
1. `specs_json->>mode = 'ambiguous_multi'` OR
2. `specs_json->>resolution_failed_reason IS NOT NULL` OR
3. `specs_json->>mode = 'llm_gate_skipped'` (when FORCE_LLM=1)

### Gate Checks (LLM_GATE)

Before calling LLM, the resolver applies these checks:

1. **Max Calls Limit** (LLM_MAX_CALLS=200)
   - Skips if `llmCallsUsed >= llmMaxCalls`
   - Marks as `llm_gate_skipped` with reason="max_calls_exceeded"

2. **Signal Quality Check**
   - Function: `hasEnoughSignal(specs)`
   - Requires ≥2 non-null spec fields from: price_usd, weight_g, drop_mm, heel_mm, forefoot_mm
   - Skips with reason="insufficient_signal"

3. **Candidates Check**
   - Requires at least one candidate snippet
   - Skips with reason="no_candidates"

**Environment Variables:**
- `LLM_GATE=1` (enabled by default, set to "0" to disable)
- `FORCE_LLM=1` (bypasses all gate checks)
- `LLM_MAX_CALLS=200` (maximum LLM calls per run)

### Prompt Building

Function: `buildPrompt(row)`
- Includes article title and URL
- Lists candidate snippets (truncated to 300 chars)
- Provides schema instructions for JSON response
- Requires single model or multiple model response formats

### LLM Call Configuration

```typescript
{
  model: process.env.RESOLVER_MODEL || 'gpt-4o-mini',
  max_tokens: parseInt(process.env.RESOLVER_MAX_TOKENS || '1000'),
  temperature: 0,
  response_format: { type: "json_object" }
}
```

### Response Parsing and Validation

1. **JSON Repair**: Uses `jsonrepair` for malformed JSON
2. **Schema Validation**: Zod schemas for:
   - `resolvedSingleSchema` (mode: "resolved")
   - `resolvedMultiSchema` (mode: "resolved_multi")
   - `ambiguousMultiSchema` (mode: "ambiguous_multi")
3. **String Normalization**: Removes newlines from text fields

### Critical Merge Behavior

**Rule: Resolver must never overwrite specs_json; it must merge into existing specs_json.**

Before fix (incorrect):
```typescript
const failureJson = { mode: 'ambiguous_multi', ... };
specs_json: failureJson  // Overwrites existing candidates/raw_strings
```

After fix (correct):
```typescript
const failurePatch = { mode: 'ambiguous_multi', ... };
const merged = { ...(existingSpecsJson ?? {}), ...failurePatch };
specs_json: merged  // Preserves existing candidates/raw_strings
```

This ensures:
- Candidate snippets (`candidates`) from extractor are preserved
- Raw strings (`raw_strings`) for debugging are preserved
- Prefilter telemetry remains intact
- Only resolution-specific fields are added/updated

### Success Update Structure

```json
{
  "specs_json": {
    // Existing fields preserved from extractor:
    "candidates": { ... },
    "raw_strings": { ... },
    "prefilter_score": number,
    "prefilter_has_anchor": boolean,
    
    // Resolution fields added:
    "mode": "resolved" | "resolved_multi" | "ambiguous_multi",
    "price_usd": number | null,
    "drop_mm": number | null,
    "weight_g": number | null,
    "heel_mm": number | null,
    "forefoot_mm": number | null,
    
    // Metadata:
    "resolved_by_meta": {
      "model": "gpt-4o-mini",
      "prompt_version": "v1",
      "timestamp": "ISO string"
    },
    
    "telemetry": {
      "snippets_provided": { "price_snippets": 3, ... },
      "prompt_tokens_approx": number
    }
  },
  
  "specs_extracted_at": "ISO string",
  "specs_method": "llm_resolver"
}
```

### Failure Handling

When LLM call or parsing fails:
1. Creates failure patch with `mode="ambiguous_multi"` and `resolution_failed_reason`
2. Merges patch with existing specs_json (preserving candidates/raw_strings)
3. Updates with `specs_method: "llm_resolver_failure"`

## Key Environment Variables

### Extraction
- `FORCE_ID`: Process specific article ID for debugging
- `FORCE_OVERWRITE`: Overwrite existing specs_json (0|1)
- `MAX_WINDOW_TOTAL_CHARS=120000`: Total characters for windowing
- `WINDOW_RADIUS=4000`: Characters around each keyword
- `SNIPPET_TOP_N=8`: Top snippets for cluster analysis
- `DEBUG_SPEC_CLUSTER=1`: Enable cluster debugging

### Resolver
- `LLM_GATE=1`: Enable LLM gate checks (0 to disable)
- `FORCE_LLM=1`: Bypass all gate checks
- `LLM_MAX_CALLS=200`: Maximum LLM calls per run
- `RESOLVER_MODEL=gpt-4o-mini`: LLM model for resolution
- `RESOLVER_MAX_TOKENS=1000`: Max tokens for LLM response
- `RESOLVER_BATCH_SIZE=5`: Batch size for processing
- `RESOLVER_LIMIT=0`: Limit number of rows processed (0 for unlimited)

## File Locations

### Primary Implementation
- `scripts/specs-pipeline/extractor.ts` - Windowed extraction
- `scripts/specs-pipeline/resolver.ts` - LLM resolver with gating
- `scripts/resolve-ambiguous-specs.ts` - Alternate resolver (legacy)
- `scripts/specs-pipeline/runner.ts` - Pipeline orchestration

### Supporting Files
- `scripts/backfill-specs-dom.ts` - Original DOM backfill implementation
- `src/etl/extract/orchestrator.ts` - Higher-level ETL orchestration

## Critical Fixes

### December 2025: Merge Behavior Fix
**Problem**: Resolver's `markFailure` function overwrote entire `specs_json`, losing `candidates` and `raw_strings`.

**Solution**: Changed from overwrite to merge:
- `failureJson` → `failurePatch`
- `const merged = { ...existingSpecsJson, ...failurePatch }`
- Applied to both `markFailure` and success updates

**Impact**: Input data preserved for future resolution attempts; debugging context maintained.

### Cluster-Based Resolution
**Problem**: High rate of `ambiguous_multi` from windowed extraction.

**Solution**: Added snippet scoring and cluster building to resolve ambiguous cases deterministically.

**Impact**: Reduced `ambiguous_multi` by 10-15% without LLM calls.

## Workflow Summary

1. **Extractor runs** on articles without specs_json
2. **Deterministic extraction** attempts to resolve specs
3. **Ambiguous cases** saved with candidates for LLM resolution
4. **Resolver runs** with gate checks to limit LLM calls
5. **LLM processes** ambiguous cases, preserving input data
6. **Results stored** with metadata for audit trail

This two-stage approach balances cost (LLM calls) with coverage, using deterministic methods first and LLM only for truly ambiguous cases with sufficient signal.
