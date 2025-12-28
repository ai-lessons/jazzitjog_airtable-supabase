# Shoe Specs Extraction Pipeline Module

This directory contains a dedicated module packaging of the existing Shoe Specs Extraction Pipeline scripts. It is intended to group the pipeline components without changing any behavior or logic.

## Components

- **runner.ts**: Orchestrates batch processing of articles, spawning child processes for extraction. Handles pagination, forced IDs, timeouts, and error handling.
- **extractor.ts**: Core extraction logic including title prefilter, content-first source selection, lightweight prefilter, DOM parsing with worker thread, multi-table detection, windowing, regex extraction, snippet scoring, and cluster-based proximity join.
- **resolver.ts**: LLM-based resolver for ambiguous extraction results, with JSON repair, schema validation, retry logic, and database updates.

## Environment Variables

The pipeline uses the following environment variables (not exhaustive):

- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY / SERVICE_KEY (required)
- FORCE_ID, FORCE_IDS, FORCE_OVERWRITE
- BATCH_SIZE, CHILD_TIMEOUT_MS
- DOM_PARSE_TIMEOUT_MS, SUPABASE_FETCH_TIMEOUT_MS
- MAX_PREFILTER_CHARS, MIN_CONTENT_LEN
- MAX_WINDOW_TOTAL_CHARS, WINDOW_RADIUS
- SNIPPET_TOP_N, DEBUG_SPEC_CLUSTER
- RESOLVER_MODEL, RESOLVER_MAX_TOKENS, RESOLVER_BATCH_SIZE, RESOLVER_LIMIT, FORCE_RESOLVE
- DEBUG_RUNNER

## Backward Compatibility

- The original scripts in `scripts/` remain unchanged and fully functional.
- The new module scripts are copies with updated internal consistency.
- Existing npm scripts invoking the original scripts remain unchanged.
- New npm scripts can be added to invoke the module scripts without affecting existing workflows.

## Usage

- Use existing npm scripts for current workflows.
- New scripts can be added for the module scripts as needed.

## Notes

- This directory is a packaging step only.
- No extraction or resolution logic changes are made here.
- Windows-safe spawn and stage tracking formats are preserved.
- No shared helpers extraction is done at this stage.
