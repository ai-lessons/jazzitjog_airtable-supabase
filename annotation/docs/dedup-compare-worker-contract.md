# Dedup Compare Worker Contract

## Purpose
The worker automates one full compare cycle for duplicate article annotations in JazzItJog_db.

## Scope
It must:
- prepare compare tasks
- claim one pending task
- send candidates to AI
- validate AI JSON response
- complete the task
- apply the winner unless dry_run is enabled

## Main Database Objects
- `public."JazzItJog_db"` – main article table
- `public.dedup_compare_tasks` – tasks for duplicate comparison
- `public.dedup_delete_log` – log of rows marked for deletion
- `public.repeats_jij_last45_actions` – operational view of last 45 rows
- `public.dedup_compare_analytics` – analytics data
- `public.dedup_compare_feed_stats` – feed statistics
- `public.dedup_compare_feed_stats_normalized` – normalized feed stats

## Main SQL Functions
- `dedup_prepare_compare_cycle(integer)` – prepares a new compare cycle
- `dedup_claim_compare_task_with_candidates()` – claims a pending task and returns candidates
- `dedup_complete_compare_task(...)` – marks a task as completed with AI decision
- `dedup_fail_compare_task(...)` – marks a task as failed with error text
- `dedup_apply_compare_winner(bigint)` – applies the winner (unless dry_run)

### Example SQL Calls
```sql
-- Prepare a new cycle with 30-minute stale threshold
SELECT * FROM dedup_prepare_compare_cycle(30);

-- Claim a task
SELECT * FROM dedup_claim_compare_task_with_candidates();

-- Complete a task
SELECT dedup_complete_compare_task(
    task_id := 123,
    winner_id := 456,
    winner_feed := 'Example Feed',
    winner_summary := 'Best summary and title match',
    decision_json := '{"version":"v2", ...}'
);

-- Fail a task
SELECT dedup_fail_compare_task(
    task_id := 123,
    error_text := 'AI response invalid: JSON parse error'
);

-- Apply winner (only when dry_run = false)
SELECT dedup_apply_compare_winner(123);
```

## Business Rules
- Only last 45 rows by ID descending are analyzed
- Duplicate grouping is based on Title and Article link normalization
- If a published row already exists for the article and new unpublished duplicates appear in the window, the new rows are marked DELETE
- If no published row exists and there are 2+ unpublished duplicates, the group is marked COMPARE
- Winner selection priority:
  - `Summary_published` weight = 0.8
  - `New Title` weight = 0.2
- Brand voice for channel "ПроТапки" must be considered
- The word "тапки" must not be penalized
- After winner application, Feed of the winner gets suffix `+++`
- Groups with an already marked winner must not return to COMPARE

## Runtime Model
**Recommended model:**
- Supabase Edge Function as the worker runtime
- Cron only triggers the Edge Function
- One invocation processes either zero tasks or exactly one task

## HTTP Entry Point
**Suggested endpoint:**
```
/functions/v1/dedup-compare-worker
```

**Method:**
- POST

**Auth:**
- Internal/service only

**Optional request body:**
```json
{
  "stale_minutes": 30,
  "dry_run": false
}
```

## Execution Flow
1. Call `dedup_prepare_compare_cycle(stale_minutes)`
2. Call `dedup_claim_compare_task_with_candidates()`
3. If no task exists, return idle success
4. If task exists, build AI payload from claimed candidates
5. Validate AI response
6. Call `dedup_complete_compare_task(...)`
7. If `dry_run` is false, call `dedup_apply_compare_winner(task_id)`

## AI Input Contract
The AI payload must contain:
  - `task_id`
  - `channel` = "ПроТапки"
  - `group_title`
  - `article_link`
  - `weights`
  - `rules`
  - `candidates` (array):
    - `id`
    - `feed`
    - `summary_published`
    - `new_title`
    - `optional_title`

**Example AI Input:**
```json
{
  "task_id": 123,
  "channel": "ПроТапки",
  "group_title": "Running shoe review",
  "article_link": "https://example.com/article",
  "weights": {
    "summary_published": 0.8,
    "new_title": 0.2
  },
  "rules": [
    "Brand voice for ПроТапки must be considered",
    "Word 'тапки' must not be penalized"
  ],
  "candidates": [
    {
      "id": 456,
      "feed": "Example Feed",
      "summary_published": "Detailed review of running shoe...",
      "new_title": "Great running shoe for asphalt"
    }
  ]
}
```

## AI Output Contract
AI must return strict JSON in `decision_json v2` format containing:
  - `version` = "v2"
  - `channel`
  - `weights`
  - `winner_id`
  - `winner_feed`
  - `winner_reason`
  - `candidates[]`

Each candidate entry must include:
  - `id`
  - `feed`
  - `summary_score`
  - `new_title_score`
  - `overall_score`
  - `brand_voice_match`
  - `strengths[]`
  - `weaknesses[]`
  - `why_won` or `why_lost`

**Example AI Output:**
```json
{
  "version": "v2",
  "channel": "ПроТапки",
  "weights": {
    "summary_published": 0.8,
    "new_title": 0.2
  },
  "winner_id": 456,
  "winner_feed": "Example Feed",
  "winner_reason": "Best combination of detailed summary and engaging title",
  "candidates": [
    {
      "id": 456,
      "feed": "Example Feed",
      "summary_score": 0.85,
      "new_title_score": 0.75,
      "overall_score": 0.83,
      "brand_voice_match": true,
      "strengths": ["Comprehensive review", "Good brand alignment"],
      "weaknesses": ["Title could be more catchy"],
      "why_won": "Highest overall score with strong brand voice match"
    },
    {
      "id": 457,
      "feed": "Another Feed",
      "summary_score": 0.70,
      "new_title_score": 0.80,
      "overall_score": 0.72,
      "brand_voice_match": false,
      "strengths": ["Catchy title"],
      "weaknesses": ["Weak brand alignment"],
      "why_lost": "Lower summary score and poor brand voice match"
    }
  ]
}
```

## Worker Validation Rules
Before saving AI output, validate:
- JSON parses successfully
- `version` == "v2"
- `winner_id` belongs to claimed candidates
- `winner_feed` matches `winner_id`
- `candidates` array is not empty
- No unknown candidate IDs are present

## Completion Rules
- `winner_summary` should store a short human-readable reason for the win
- `decision_json` should store the full validated AI JSON
- `dedup_apply_compare_winner` must only run after successful completion and only when `dry_run = false`

## Error Handling
If task already claimed and any later stage fails, call `dedup_fail_compare_task` with useful `error_text`.

**Typical failure cases:**
- AI call failed
- Non-JSON AI output
- Invalid JSON schema
- `winner_id` not in claimed candidate set
- DB completion failed

## Idle Behavior
If no task is available, return a normal success response with idle status.

**Example idle response:**
```json
{
  "status": "idle",
  "message": "No pending tasks available"
}
```

## Logging Requirements
The worker should log:
- Start
- Prepare result
- Claim result with `task_id`
- Candidate count
- AI request started
- AI response received
- Validation result
- Complete result
- Apply result or dry_run skip
- Final status

## Things Intentionally Out of Scope for Now
- Physical deletion of DELETE rows
- Processing multiple tasks in one run
- Changing scoring logic in DB
- Editing candidate content fields

## Important Invariants
- `repeats_jij_last45_actions` is the main operational view
- Groups are excluded from repeated compare via Feed `+++`
- DELETE is currently logged only, not physically applied

---

*Document version: 1.0*  
*Last updated: 2026-03-22*