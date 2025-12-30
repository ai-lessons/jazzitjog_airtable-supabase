# Specs Pipeline – Architecture & Invariants

## 1. Purpose & Responsibilities

Populate structured sneaker specs (price, weight, drop, stack height) from unstructured article content (text or HTML) in the `JazzItJog_db` table. The pipeline guarantees:

- Deterministic extraction first, using keyword windowing and regex.
- LLM usage only for true ambiguity, with strict gating to control cost.
- Full traceability: every row’s `specs_json` preserves raw inputs (`raw_strings`, `candidates`), telemetry, and resolution metadata.

## 2. High‑Level Data Flow

**Stage A – Extractor (`scripts/specs‑pipeline/extractor.ts`)**

1. **Source selection**  
   - Prefer the article’s `"Content"` field if ≥2000 characters → `source_used='content'`.  
   - Otherwise fetch HTML from `"Article link"` → `source_used='fetched_html'`.

2. **Prefilter chain**  
   - Title prefilter: skip non‑shoe articles (headphones, watches, etc.).  
   - Lightweight prefilter (HTML path only): extract first ~160k chars; reject obvious non‑shoe content.  
   - Large HTML guard: skip DOM parsing if HTML >~600k bytes (skip reason `large_html`).  
   - DOM parse via worker thread (`parseDomWithWorker`) with timeout (default 5000 ms). Timeout → skip reason `timeout`.  
   - Shoe‑article prefilter (`isLikelyShoeArticle`): weighted keyword scoring with anchor detection.

3. **Keyword windowing**  
   - `buildKeywordWindows(pageText)` uses a configurable radius (default ~4000 chars) and total character cap (default ~120k).  
   - Windows are merged when overlapping.

4. **Deterministic extraction**  
   - `extractSpecsFromWindows(windows)` applies regex patterns for price, weight, drop, heel, forefoot.  
   - Candidate snippets are scored by spec density and clustered; ambiguous cases produce `mode='ambiguous_multi'` with `candidates` and `requires_llm_resolution=true`.  
   - Multi‑table detection: if the DOM worker returns `multi_table_data.models.length >= 2`, the row is set to `mode='multi_table'` (precedence over windowed extraction).

5. **Write result**  
   - Update `JazzItJog_db.specs_json` with the extracted mode, values, candidates, raw strings, and telemetry.  
   - Set `specs_method` (e.g., `dom_windowed_single`, `dom_windowed_ambiguous`, `dom_multi_table`, or skip reasons).  
   - Update `specs_extracted_at`.

**Stage B – Resolver (`scripts/specs‑pipeline/resolver.ts`)**

1. **Row selection**  
   - Base filter: `specs_json.mode = 'ambiguous_multi'`.  
   - Include `specs_json.mode = 'llm_gate_skipped'` only when `FORCE_LLM=1`.

2. **Gate checks** (enabled unless `LLM_GATE=0`)  
   - `LLM_MAX_CALLS` cap: skip with `max_calls_exceeded`.  
   - Signal quality (`hasEnoughSignal`): require ≥2 non‑null spec fields.  
   - Candidates presence: at least one candidate snippet.  
   - If any check fails, update row with:
     - `specs_json.mode = 'llm_gate_skipped'`
     - `gate_skip_reason` (e.g., `insufficient_signal`, `no_candidates`)
     - `previous_mode`, `previous_requires_llm_resolution`
     - `specs_method = 'llm_gate_skip'`

3. **LLM resolution**  
   - Build prompt from candidates and raw strings.  
   - Call configured LLM (`RESOLVER_MODEL`, `RESOLVER_MAX_TOKENS`).  
   - Parse and validate response against Zod schemas (`resolvedSingleSchema`, `resolvedMultiSchema`, `ambiguousMultiSchema`).  
   - **Critical merge rule:** Success/failure patches are merged into existing `specs_json`, preserving `candidates`, `raw_strings`, and telemetry.  
   - Update `specs_method` to `llm_resolver` (success) or `llm_resolver_failure` (error).

## 3. Key Architectural Parameters

### Extractor
| Parameter | Type | Effect |
|-----------|------|--------|
| `FORCE_ID` | string/int | Process only the row with this ID (debugging). |
| `FORCE_OVERWRITE` | 0/1 | Allow overwriting existing `specs_json` (otherwise only write if null or skipped). |
| `DOM_PARSE_TIMEOUT_MS` | ms (default 5000) | Timeout for DOM parsing in worker thread. |
| `WINDOW_RADIUS` | chars (default ~4000) | Radius around each keyword hit for windowing. |
| `MAX_WINDOW_TOTAL_CHARS` | chars (default ~120000) | Total character cap for concatenated windows. |
| HTML size guard threshold | bytes (~600000) | Skip DOM parsing when HTML exceeds this size. |

### Resolver
| Parameter | Type | Effect |
|-----------|------|--------|
| `LLM_GATE` | 0/1 | Enable gate checks (1) or bypass them (0). |
| `LLM_MAX_CALLS` | int (default 200) | Hard cap on LLM calls per run. |
| `FORCE_LLM` | 0/1 | Include `llm_gate_skipped` rows in selection. |
| `FORCE_ID` | string/int | Target a single row (if supported). |
| `RESOLVER_BATCH_SIZE` | int (default 5) | **Only** batch‑size knob used by the resolver. |
| `RESOLVER_LIMIT` | int (default 0) | Stop after processing N rows (0 = unlimited). |
| `RESOLVER_MODEL` | string (default `gpt‑4o‑mini`) | LLM model for resolution. |
| `RESOLVER_MAX_TOKENS` | int (default 1000) | Max tokens in LLM response. |

## 4. Core Invariants & Contracts

### Extractor
- If `mode='ambiguous_multi'` → **must** set `requires_llm_resolution=true` and include `candidates` (object of arrays) + `raw_strings`.
- Multi‑table precedence: when `multi_table_data.models.length >= 2`, set `mode='multi_table'` and `specs_method='dom_multi_table'` regardless of windowed extraction results.

### Resolver
- **Never overwrite `specs_json`.** Success and failure patches **must** merge into the existing JSON, preserving `candidates`, `raw_strings`, and telemetry.
- Gate failure → set `mode='llm_gate_skipped'`, `gate_skip_reason`, `specs_method='llm_gate_skip'`, and preserve previous mode/requirements.
- Row selection must mirror `processRow()`: only `mode='ambiguous_multi'` by default, plus `mode='llm_gate_skipped'` when `FORCE_LLM=1`. Do **not** use `resolution_failed_reason.not.is.null` as a generic selector.

### `specs_method` Semantics
| Context | Example Values |
|---------|----------------|
| Extractor (windowed) | `dom_windowed_single`, `dom_windowed_ambiguous` |
| Extractor (multi‑table) | `dom_multi_table` |
| Extractor (skip) | `title_prefilter_skip`, `large_html_skip`, `not_shoe_article`, `timeout`, `child_error` |
| Resolver (success) | `llm_resolver` |
| Resolver (failure) | `llm_resolver_failure` |
| Resolver (gate skip) | `llm_gate_skip` |

## 5. Error Handling & Edge Cases

- **Fetch HTML timeout**: row marked as `skipped` with reason `fetch_timeout` (does not crash the run).
- **DOM parse timeout**: row marked as `skipped` with reason `timeout`.
- **Non‑shoe detection**: `skipped` with reason `not_shoe_article` (or `title_prefilter_skip`).
- **Child‑process error**: `skipped` with reason `child_error`.
- **Idempotency**: Without `FORCE_OVERWRITE=1`, rows that already have a `specs_json` (and are not in a skip state) are left untouched.

## 6. Operational Gotchas & Best Practices

- **Resolver batch sizing**: `RESOLVER_BATCH_SIZE` is the effective batch size; the `BATCH_SIZE` environment variable is **not** used by `scripts/specs‑pipeline/resolver.ts`.
- **Gate skip alters mode**: Gate failure rewrites rows to `mode='llm_gate_skipped'`, which can reduce the count of `ambiguous_multi` rows to zero without any LLM resolution.
- **Row selection contract**: Base selection must align with `processRow()` – only `ambiguous_multi` by default, plus `llm_gate_skipped` only when `FORCE_LLM=1`. Avoid using `resolution_failed_reason.not.is.null` as a generic selector.
- **Interpretation**: “No more ambiguous_multi rows” **does not** mean “all resolved”; some rows may be `llm_gate_skipped` and require a rerun with different gating settings.
- **Merge invariant**: The resolver must **never** overwrite `specs_json`; it must merge patches and preserve `candidates`, `raw_strings`, and telemetry.
- **Multi‑table precedence**: When a DOM worker returns `multi_table_data`, the extractor uses that data regardless of windowed extraction results.
- **Prompt tokens**: The resolver estimates prompt tokens as `prompt.length / 4` (rough approximation) and stores it in `specs_json.telemetry.prompt_tokens_approx`.
- **Debugging**: Use `FORCE_ID` and `DEBUG_RUNNER=1` to isolate a single row; check `specs_json.raw_strings` and `candidates` to understand extraction quality.

## See Also

- Detailed workflow and command reference: [Specs Pipeline Workflow](./specs_pipeline_workflow.md)
