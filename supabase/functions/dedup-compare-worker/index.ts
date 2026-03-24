// Dedup Compare Worker - Supabase Edge Function
// 
// Contract references:
// - annotation/docs/dedup-compare-worker-contract.md
// - annotation/contracts/dedup-compare-decision-json-v2-spec.md

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  stale_minutes?: number;
  dry_run?: boolean;
}

// Helper: Build AI payload from claimed task candidates
// Reference: annotation/contracts/dedup-compare-decision-json-v2-spec.md
function buildAIPayload(candidates: any[], task_id: number, group_title: string, article_link: string) {
  return {
    task_id,
    channel: "ПроТапки",
    group: {
      group_title,
      article_link
    },
    weights: {
      summary_published: 0.8,
      new_title: 0.2
    },
    rules: {
      primary_metric: "summary_published",
      secondary_metric: "new_title",
      brand_word_tapki_allowed: true,
      brand_voice_should_be_considered: true
    },
    candidates: candidates.map((c: any) => {
      const payload: any = {
        id: c.candidate_id || c.id,
        feed: c.feed || c.Feed || "",
        summary_published: c.summary_published || c.Summary_published || "",
        new_title: c.new_title || c["New Title"] || c.title || ""
      };
      // Include optional title only if available
      if (c.title && c.title !== payload.new_title) {
        payload.optional_title = c.title;
      }
      return payload;
    })
  };
}

serve(async (req: Request): Promise<Response> => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse optional request body
    let stale_minutes = 30; // default
    let dry_run = false; // default

    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body: RequestBody = await req.json();
      if (body.stale_minutes !== undefined) {
        stale_minutes = body.stale_minutes;
      }
      if (body.dry_run !== undefined) {
        dry_run = body.dry_run;
      }
    }

    // Basic validation
    if (typeof stale_minutes !== "number" || stale_minutes < 0) {
      return new Response(
        JSON.stringify({ error: "Invalid stale_minutes" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (typeof dry_run !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Invalid dry_run" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // PREPARE CYCLE & CLAIM TASK
    // ========================================
    
    // Read required environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required environment variables",
          details: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call: dedup_prepare_compare_cycle(stale_minutes)
    // Purpose: Identify pending compare tasks based on duplicates in last 45 rows
    const { data: prepareData, error: prepareError } = await supabase.rpc(
      "dedup_prepare_compare_cycle",
      { p_stale_minutes: stale_minutes }
    );

    if (prepareError) {
      console.error("Prepare cycle error:", prepareError);
      return new Response(
        JSON.stringify({
          error: "Prepare cycle failed",
          details: prepareError.message,
          stage: "prepare"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call: dedup_claim_compare_task_with_candidates()
    // Purpose: Claim one pending task and return candidate rows
    const { data: claimData, error: claimError } = await supabase.rpc(
      "dedup_claim_compare_task_with_candidates"
    );

    if (claimError) {
      console.error("Claim task error:", claimError);
      return new Response(
        JSON.stringify({
          error: "Claim task failed",
          details: claimError.message,
          stage: "claim"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle response based on claim result
    if (!claimData || (Array.isArray(claimData) && claimData.length === 0)) {
      // No task available - return idle
      return new Response(
        JSON.stringify({
          ok: true,
          stage: "idle",
          message: "No pending compare tasks",
          prepare: prepareData
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Task claimed - extract diagnostic info
    // Be defensive about the shape
    const candidates = Array.isArray(claimData) ? claimData : [claimData];
    const firstCandidate = candidates[0] || {};
    
    const task_id = firstCandidate.task_id;
    const candidate_count = candidates.length;
    const candidate_ids = candidates.map((c: any) => c.candidate_id || c.id).filter(Boolean);
    const group_title = firstCandidate.group_title || firstCandidate.title || "";
    const article_link = firstCandidate.article_link || firstCandidate.link || "";

    // Helper: Mark task as failed (best-effort, no-throw)
    const markTaskFailed = async (errorText: string) => {
      try {
        await supabase.rpc("dedup_fail_compare_task", {
          p_task_id: task_id,
          p_error_text: errorText
        });
      } catch (failError) {
        console.error("Failed to mark task as failed:", failError);
      }
    };

    // ========================================
    // BUILD AI PAYLOAD
    // ========================================
    // Build normalized payload per annotation/contracts/dedup-compare-decision-json-v2-spec.md
    const aiPayload = buildAIPayload(candidates, task_id, group_title, article_link);
    
    // ========================================
    // CALL AI
    // ========================================
    // System prompt from annotation/contracts/dedup-compare-decision-json-v2-spec.md
    const systemPrompt = `You are an editorial evaluator for duplicate article annotations in the channel "ПроТапки". Your task is to select the single best candidate from a set of duplicate rows.

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

**CRITICAL OUTPUT SCHEMA REQUIREMENTS**:
You MUST return a flat JSON object with ALL of these fields at the ROOT level (NOT nested):
- "version": "v2" (exact string)
- "channel": "ПроТапки" (exact string)
- "winner_id": <winning candidate id> (number)
- "winner_feed": <winner's feed value> (string)
- "winner_reason": <brief explanation> (string)
- "candidates": [...] (array of candidate objects, NOT nested under "scores" or any wrapper)

Each candidate object in the "candidates" array MUST include:
- "id": <candidate id> (number)
- "feed": <feed value> (string)
- "summary_score": <0-10> (number)
- "new_title_score": <0-10> (number)
- "overall_score": <computed score> (number)
- "brand_voice_match": <true/false> (boolean)
- "why_won": <explanation> (string, only for winner)
- "why_lost": <explanation> (string, only for non-winners)

**EXAMPLE STRUCTURE** (use this exact format):
{
  "version": "v2",
  "channel": "ПроТапки",
  "winner_id": 369,
  "winner_feed": "Test Feed",
  "winner_reason": "Better summary quality",
  "candidates": [
    {"id": 369, "feed": "Test Feed", "summary_score": 8, "new_title_score": 7, "overall_score": 7.8, "brand_voice_match": true, "why_won": "More complete review"},
    {"id": 370, "feed": "Test Feed", "summary_score": 6, "new_title_score": 6, "overall_score": 6.0, "brand_voice_match": true, "why_lost": "Less technical detail"}
  ]
}

DO NOT nest candidates under "scores" or any other wrapper. Output ONLY this exact flat structure.`;

    // Read OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing OpenAI API key",
          details: "OPENAI_API_KEY environment variable is required",
          stage: "ai_call"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(aiPayload) }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      await markTaskFailed(`AI call failed (HTTP ${openaiResponse.status}): ${errorText.substring(0, 500)}`);
      return new Response(
        JSON.stringify({
          error: "AI call failed",
          details: errorText,
          openai_http_status: openaiResponse.status,
          stage: "ai_call"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponseText = openaiData.choices?.[0]?.message?.content;

    if (!aiResponseText) {
      await markTaskFailed("AI response empty: OpenAI returned no content");
      return new Response(
        JSON.stringify({
          error: "AI response empty",
          details: "OpenAI returned no content",
          openai_http_status: openaiResponse.status,
          openai_data_preview: JSON.stringify(openaiData).substring(0, 500),
          stage: "ai_call"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // VALIDATE DECISION_JSON V2
    // ========================================
    // Reference: annotation/contracts/dedup-compare-decision-json-v2-spec.md (Validation Checklist)
    
    let decisionJson: any;
    try {
      decisionJson = JSON.parse(aiResponseText);
    } catch (parseError) {
      await markTaskFailed(`AI response not valid JSON: ${(parseError as Error).message}`);
      return new Response(
        JSON.stringify({
          error: "AI response not valid JSON",
          details: (parseError as Error).message,
          stage: "ai_parse",
          ai_response_preview: aiResponseText.substring(0, 200)
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validation checklist
    const validationErrors: string[] = [];

    // Check version
    if (decisionJson.version !== "v2") {
      validationErrors.push(`Invalid version: expected "v2", got "${decisionJson.version}"`);
    }

    // Check channel
    if (decisionJson.channel !== "ПроТапки") {
      validationErrors.push(`Invalid channel: expected "ПроТапки", got "${decisionJson.channel}"`);
    }

    // Check winner_id present
    if (!decisionJson.winner_id) {
      validationErrors.push("Missing winner_id");
    }

    // Check candidates array
    if (!Array.isArray(decisionJson.candidates) || decisionJson.candidates.length === 0) {
      validationErrors.push("Candidates array is missing or empty");
    }

    // Check candidate IDs match input
    const inputCandidateIds = new Set(aiPayload.candidates.map((c: any) => c.id));
    const outputCandidateIds = new Set(decisionJson.candidates?.map((c: any) => c.id) || []);
    
    for (const id of inputCandidateIds) {
      if (!outputCandidateIds.has(id)) {
        validationErrors.push(`Missing candidate ID in output: ${id}`);
      }
    }
    
    for (const id of outputCandidateIds) {
      if (!inputCandidateIds.has(id)) {
        validationErrors.push(`Unknown candidate ID in output: ${id}`);
      }
    }

    // Check winner_id is in candidate set
    if (decisionJson.winner_id && !inputCandidateIds.has(decisionJson.winner_id)) {
      validationErrors.push(`Winner ID ${decisionJson.winner_id} not in input candidate set`);
    }

    // Check winner_feed consistency
    if (decisionJson.winner_id && decisionJson.candidates) {
      const winnerCandidate = decisionJson.candidates.find((c: any) => c.id === decisionJson.winner_id);
      if (winnerCandidate && winnerCandidate.feed !== decisionJson.winner_feed) {
        validationErrors.push(`Winner feed mismatch: expected "${winnerCandidate.feed}", got "${decisionJson.winner_feed}"`);
      }
    }

    // Check numeric scores for each candidate
    if (decisionJson.candidates && Array.isArray(decisionJson.candidates)) {
      for (const candidate of decisionJson.candidates) {
        if (typeof candidate.summary_score !== "number") {
          validationErrors.push(`Candidate ${candidate.id}: summary_score must be numeric`);
        }
        if (typeof candidate.new_title_score !== "number") {
          validationErrors.push(`Candidate ${candidate.id}: new_title_score must be numeric`);
        }
        if (typeof candidate.overall_score !== "number") {
          validationErrors.push(`Candidate ${candidate.id}: overall_score must be numeric`);
        }
      }
    }

    // Check why_won/why_lost fields
    if (decisionJson.winner_id && decisionJson.candidates && Array.isArray(decisionJson.candidates)) {
      const winnerCandidate = decisionJson.candidates.find((c: any) => c.id === decisionJson.winner_id);
      if (winnerCandidate) {
        if (!winnerCandidate.why_won || typeof winnerCandidate.why_won !== "string" || winnerCandidate.why_won.trim() === "") {
          validationErrors.push(`Winner candidate ${winnerCandidate.id}: must have non-empty why_won`);
        }
      }
      
      for (const candidate of decisionJson.candidates) {
        if (candidate.id !== decisionJson.winner_id) {
          if (!candidate.why_lost || typeof candidate.why_lost !== "string" || candidate.why_lost.trim() === "") {
            validationErrors.push(`Non-winner candidate ${candidate.id}: must have non-empty why_lost`);
          }
        }
      }
    }

    // If validation failed, return error with diagnostics
    if (validationErrors.length > 0) {
      await markTaskFailed(`AI validation failed: ${validationErrors.join("; ")}`);
      return new Response(
        JSON.stringify({
          error: "AI response validation failed",
          validation_errors: validationErrors,
          openai_http_status: openaiResponse.status,
          ai_response_text_preview: aiResponseText.substring(0, 1000),
          parsed_decision_preview: {
            version: decisionJson.version,
            channel: decisionJson.channel,
            candidate_count: decisionJson.candidates?.length || 0,
            has_winner_id: !!decisionJson.winner_id
          },
          stage: "ai_validate"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // COMPLETE TASK
    // ========================================
    // Call: dedup_complete_compare_task to store validated decision_json
    // p_winner_summary: short human-readable summary from winner_reason
    const winner_summary = decisionJson.winner_reason 
      ? decisionJson.winner_reason.substring(0, 200) // Truncate to reasonable length
      : "Winner selected";

    const { error: completeError } = await supabase.rpc(
      "dedup_complete_compare_task",
      {
        p_task_id: task_id,
        p_winner_id: decisionJson.winner_id,
        p_winner_summary: winner_summary,
        p_decision_json: JSON.stringify(decisionJson)
      }
    );

    if (completeError) {
      console.error("Complete task error:", completeError);
      await markTaskFailed(`Complete task failed: ${completeError.message}`);
      return new Response(
        JSON.stringify({
          error: "Complete task failed",
          details: completeError.message,
          stage: "complete"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // APPLY WINNER
    // ========================================
    // Conditionally apply winner based on dry_run flag
    let applyResult: { applied: boolean; reason?: string };

    if (dry_run === false) {
      // Call: dedup_apply_compare_winner(task_id)
      // Purpose: Mark winner feed with +++, apply business rules
      const { error: applyError } = await supabase.rpc(
        "dedup_apply_compare_winner",
        { p_task_id: task_id }
      );

      if (applyError) {
        console.error("Apply winner error:", applyError);
        await markTaskFailed(`Apply winner failed: ${applyError.message}`);
        return new Response(
          JSON.stringify({
            error: "Apply winner failed",
            details: applyError.message,
            stage: "apply"
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      applyResult = { applied: true };
    } else {
      // dry_run is true - skip apply
      applyResult = { applied: false, reason: "dry_run" };
    }

    // Validation passed, task completed, and apply handled - return success with diagnostic preview
    return new Response(
      JSON.stringify({
        ok: true,
        stage: "validated_decision",
        task_id,
        candidate_count,
        dry_run,
        prepare: prepareData,
        task_preview: {
          group_title,
          article_link,
          candidate_ids
        },
        ai_payload_preview: {
          ai_payload_ready: true,
          ai_candidate_count: aiPayload.candidates.length,
          ai_payload_keys: Object.keys(aiPayload)
        },
        decision_preview: {
          winner_id: decisionJson.winner_id,
          winner_feed: decisionJson.winner_feed,
          version: decisionJson.version,
          validated: true
        },
        completion: {
          written: true
        },
        apply: applyResult
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Worker error:", error);
    // Only mark as failed if we have a task_id (task was claimed)
    // This catch handles unexpected errors after claim
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
