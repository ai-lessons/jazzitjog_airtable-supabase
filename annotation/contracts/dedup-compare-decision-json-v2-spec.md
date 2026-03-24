# Dedup Compare AI Spec — decision_json v2

## Purpose
This document defines the exact AI prompt contract and output requirements for selecting the best annotation among duplicate article candidates.

## Context
The AI compares duplicate candidates from JazzItJog_db for channel "ПроТапки". Each candidate is a row in the database with fields: id, feed, summary_published, new_title, optional title.

## Fixed Business Rules
- **Primary criterion**: Summary_published (quality, completeness, relevance)
- **Secondary criterion**: New Title (clarity, engagement, keyword relevance)
- **Weights**:
  - `summary_published` = 0.8
  - `new_title` = 0.2
- **Channel brand voice**: "ПроТапки" – conversational, expert‑but‑accessible, focused on running shoe reviews and gear advice
- **Special rule**: The word "тапки" must not be penalized (it is a colloquial term for shoes in this context)
- **Selection rule**: AI must choose exactly one winner from the claimed candidate set
- **Integrity rule**: AI must not invent candidates, fields, or IDs

## AI Input Payload
**Structure**:
```json
{
  "task_id": 12345,
  "channel": "ПроТапки",
  "group": {
    "group_title": "Running shoe review",
    "article_link": "https://example.com/article"
  },
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
      "summary_published": "Detailed review of the latest running shoe model...",
      "new_title": "Great running shoe for asphalt",
      "optional_title": "Optional original title if different"
    }
  ]
}
```

**Field definitions**:
- `task_id`: unique task identifier (integer)
- `channel`: always "ПроТапки"
- `group.group_title`: normalized title of the duplicate group
- `group.article_link`: canonical article URL
- `weights`: fixed as shown
- `rules`: reminder strings for the AI
- `candidates[]`: array of candidate rows; each must have:
  - `id`: database row ID (integer)
  - `feed`: source feed name
  - `summary_published`: the published summary text
  - `new_title`: the new title proposed for publication
  - `optional_title`: optional original title (may be empty or same as new_title)

## System Prompt
**English system prompt (to be sent to the AI model)**:

```
You are an editorial evaluator for duplicate article annotations in the channel "ПроТапки". Your task is to select the single best candidate from a set of duplicate rows.

**Primary criterion**: Summary_published (weight 0.8). Evaluate:
- Completeness of the review
- Relevance to running shoes
- Clarity and structure
- Technical detail without excessive jargon

**Secondary criterion**: New Title (weight 0.2). Evaluate:
- Clarity and engagement
- Keyword relevance (running, shoe, model name, surface type)
- Appropriateness for the "ПроТапки" audience

**Brand voice considerations**:
- "ПроТапки" is conversational, expert‑but‑accessible
- Focus on practical advice for runners
- Avoid overly promotional or generic language
- The word "тапки" (colloquial for shoes) is acceptable and should not be penalized

**Rules**:
1. You MUST output strict JSON only, no markdown, no commentary, no extra text.
2. You MUST choose one and only one winner from the provided candidates.
3. You MUST NOT invent candidates, fields, or IDs.
4. Use the exact weights: summary_published 0.8, new_title 0.2.
5. For each candidate, compute:
   - summary_score (0–10)
   - new_title_score (0–10)
   - overall_score = (summary_score * 0.8) + (new_title_score * 0.2)
   - brand_voice_match (boolean)

**Output format**: You must return a JSON object with the exact shape specified in the "Output schema" section.
```

## Scoring Guidance
- **summary_score (0–10)**:
  - 0‑3: Very poor – missing key details, irrelevant, poorly structured
  - 4‑6: Adequate – covers basics but lacks depth or clarity
  - 7‑8: Good – comprehensive, well‑structured, relevant
  - 9‑10: Excellent – thorough, insightful, perfectly matches channel voice
- **new_title_score (0–10)**:
  - 0‑3: Poor – vague, misleading, or inappropriate
  - 4‑6: Acceptable – clear but generic or unengaging
  - 7‑8: Strong – catchy, keyword‑rich, appropriate for audience
  - 9‑10: Outstanding – highly engaging, perfect keyword balance, matches brand voice
- **brand_voice_match (boolean)**: true if the candidate's language aligns with "ПроТапки" (conversational, expert‑but‑accessible, practical); false if overly promotional, generic, or off‑topic.

**What makes a stronger Summary_published**:
- Specific details about shoe model, features, performance
- Structured comparison (pros/cons, use cases)
- Practical advice for runners
- Clear, concise language

**What makes a stronger New Title**:
- Includes key keywords (e.g., "running shoe", "asphalt", "lightweight")
- Engaging but not clickbaity
- Matches the channel's conversational tone
- Clearly indicates the article's value

## Output Schema
**Exact JSON shape**:
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
      "summary_score": 8.5,
      "new_title_score": 7.5,
      "overall_score": 8.3,
      "brand_voice_match": true,
      "strengths": ["Comprehensive review", "Good brand alignment"],
      "weaknesses": ["Title could be more catchy"],
      "why_won": "Highest overall score with strong brand voice match"
    },
    {
      "id": 457,
      "feed": "Another Feed",
      "summary_score": 7.0,
      "new_title_score": 8.0,
      "overall_score": 7.2,
      "brand_voice_match": false,
      "strengths": ["Catchy title"],
      "weaknesses": ["Weak brand alignment"],
      "why_lost": "Lower summary score and poor brand voice match"
    }
  ]
}
```

## Output Rules
1. **version**: must be exactly `"v2"`
2. **channel**: must be exactly `"ПроТапки"`
3. **winner_id**: exactly one winner; must be one of the input candidate IDs
4. **winner_feed**: must match the feed of the winner_id candidate
5. **candidates array**:
   - Every input candidate must appear exactly once
   - No unknown candidates allowed
   - Order does not matter
6. **Candidate fields**:
   - `why_won` present for winner candidate only
   - `why_lost` present for non‑winner candidates only
   - `strengths` and `weaknesses`: arrays of strings (max 3 items each)
7. **No prose outside JSON**: the response must be pure JSON, no markdown wrappers, no explanatory text.

## Validation Checklist
The future worker must validate the AI response using this checklist:

- [ ] **Valid JSON**: response parses as JSON
- [ ] **Version**: `version == "v2"`
- [ ] **Candidate IDs match**: every input candidate ID appears exactly once in output candidates; no extra IDs, no missing IDs
- [ ] **One winner only**: exactly one `winner_id` present
- [ ] **Winner consistency**: `winner_feed` matches the feed of the candidate with `winner_id`
- [ ] **Candidates array not empty**: `candidates` array length > 0
- [ ] **Numeric scores present**: each candidate has numeric `summary_score`, `new_title_score`, `overall_score` (0–10 range)
- [ ] **No extra text**: response contains no text outside the JSON object

## Failure Examples
**Bad outputs that must be rejected**:

1. **Non‑JSON response**:
   ```
   I think candidate 456 is the best because...
   ```

2. **Winner_id not in candidate set**:
   ```json
   {"version":"v2","winner_id":999,...}
   ```

3. **Missing candidate**:
   Input candidates: [456, 457]; output candidates: [456] only

4. **Extra candidate**:
   Input candidates: [456]; output candidates: [456, 999]

5. **Markdown wrapper**:
   ```markdown
   Here is my evaluation:
   ```json
   {"version":"v2",...}
   ```
   ```

6. **Wrong version**:
   ```json
   {"version":"v1",...}
   ```

7. **Missing required field**:
   ```json
   {"version":"v2","winner_id":456} // missing candidates array
   ```

## Notes for Implementation
- This file is the contract for future Edge Function integration and response validation.
- The system prompt should be sent as the `system` role in OpenAI‑style chat completions.
- The AI input payload should be sent as the `user` role (JSON string).
- The worker must validate the AI response against this spec before saving to database.
- If validation fails, the worker should call `dedup_fail_compare_task` with appropriate error text.

---

*Document version: 1.0*  
*Last updated: 2026-03-22*  
*Next: Implement Edge Function worker using this spec.*