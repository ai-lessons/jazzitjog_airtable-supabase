-- Migration 013: Create dedup core worker functions
-- This migration creates the essential functions for the dedup compare worker runtime
-- Functions: claim, complete, apply winner, fail, get candidates

-- Function: dedup_claim_compare_task
-- Claims a pending task and marks it as processing (simple version without candidates)
CREATE OR REPLACE FUNCTION "public"."dedup_claim_compare_task"() 
RETURNS TABLE("task_id" bigint, "group_title" text, "article_link" text, "row_ids" bigint[])
LANGUAGE "sql"
AS $$
  with picked as (
    select id
    from public.dedup_compare_tasks
    where status = 'pending'
    order by id
    for update skip locked
    limit 1
  )
  update public.dedup_compare_tasks t
  set
    status = 'processing',
    locked_at = now()
  from picked p
  where t.id = p.id
  returning
    t.id as task_id,
    t.group_title,
    t.article_link,
    t.row_ids;
$$;

ALTER FUNCTION "public"."dedup_claim_compare_task"() OWNER TO "postgres";

-- Function: dedup_claim_compare_task_with_candidates
-- Claims a pending task and returns task details with candidate article data
CREATE OR REPLACE FUNCTION "public"."dedup_claim_compare_task_with_candidates"() 
RETURNS TABLE(
  "task_id" bigint, 
  "group_title" text, 
  "article_link" text, 
  "candidate_id" bigint, 
  "title" text, 
  "published" text, 
  "feed" text, 
  "summary_published" text, 
  "new_title" text
)
LANGUAGE "sql"
AS $$
  with picked as (
    select id
    from public.dedup_compare_tasks
    where status = 'pending'
    order by id
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.dedup_compare_tasks t
    set
      status = 'processing',
      locked_at = now()
    from picked p
    where t.id = p.id
    returning t.id, t.group_title, t.article_link, t.row_ids
  )
  select
    c.id as task_id,
    c.group_title,
    c.article_link,
    j."ID"::bigint as candidate_id,
    j."Title"::text as title,
    j."Published"::text as published,
    j."Feed"::text as feed,
    j."Summary_published"::text as summary_published,
    j."New Title"::text as new_title
  from claimed c
  join public."JazzItJog_db" j
    on j."ID" = any(c.row_ids)
  order by j."ID";
$$;

ALTER FUNCTION "public"."dedup_claim_compare_task_with_candidates"() OWNER TO "postgres";

-- Function: dedup_complete_compare_task
-- Marks a task as done with winner selection and decision data
CREATE OR REPLACE FUNCTION "public"."dedup_complete_compare_task"(
  "p_task_id" bigint, 
  "p_winner_id" bigint, 
  "p_winner_summary" text, 
  "p_decision_json" jsonb
) 
RETURNS void
LANGUAGE "sql"
AS $$
  update public.dedup_compare_tasks
  set
    status = 'done',
    winner_id = p_winner_id,
    winner_summary = p_winner_summary,
    decision_json = p_decision_json,
    error_text = null,
    locked_at = null
  where id = p_task_id;
$$;

ALTER FUNCTION "public"."dedup_complete_compare_task"(bigint, bigint, text, jsonb) OWNER TO "postgres";

-- Function: dedup_apply_compare_winner
-- Applies the winner decision by marking the winning article with +++ in Feed column
CREATE OR REPLACE FUNCTION "public"."dedup_apply_compare_winner"("p_task_id" bigint) 
RETURNS void
LANGUAGE "plpgsql"
AS $$
declare
  v_winner_id bigint;
  v_current_feed text;
begin
  select winner_id
  into v_winner_id
  from public.dedup_compare_tasks
  where id = p_task_id
    and status = 'done';

  if v_winner_id is null then
    raise exception 'Task % is not done or winner is null', p_task_id;
  end if;

  select "Feed"
  into v_current_feed
  from public."JazzItJog_db"
  where "ID" = v_winner_id;

  update public."JazzItJog_db"
  set "Feed" = case
    when right(coalesce(v_current_feed, ''), 3) = '+++'
      then v_current_feed
    else coalesce(v_current_feed, '') || '+++'
  end
  where "ID" = v_winner_id;

  update public.dedup_compare_tasks
  set applied_at = now()
  where id = p_task_id;
end;
$$;

ALTER FUNCTION "public"."dedup_apply_compare_winner"(bigint) OWNER TO "postgres";

-- Function: dedup_fail_compare_task
-- Marks a task as failed with error details
CREATE OR REPLACE FUNCTION "public"."dedup_fail_compare_task"(
  "p_task_id" bigint, 
  "p_error_text" text
) 
RETURNS void
LANGUAGE "sql"
AS $$
  update public.dedup_compare_tasks
  set
    status = 'error',
    error_text = p_error_text,
    locked_at = null
  where id = p_task_id;
$$;

ALTER FUNCTION "public"."dedup_fail_compare_task"(bigint, text) OWNER TO "postgres";

-- Function: dedup_get_compare_candidates
-- Gets candidate article data for a specific task
CREATE OR REPLACE FUNCTION "public"."dedup_get_compare_candidates"("p_task_id" bigint) 
RETURNS TABLE(
  "task_id" bigint, 
  "id" bigint, 
  "title" text, 
  "article_link" text, 
  "published" text, 
  "feed" text, 
  "summary_published" text, 
  "new_title" text
)
LANGUAGE "sql"
AS $$
  select
    t.id as task_id,
    j."ID"::bigint as id,
    j."Title"::text as title,
    j."Article link"::text as article_link,
    j."Published"::text as published,
    j."Feed"::text as feed,
    j."Summary_published"::text as summary_published,
    j."New Title"::text as new_title
  from public.dedup_compare_tasks t
  join public."JazzItJog_db" j
    on j."ID" = any(t.row_ids)
  where t.id = p_task_id
  order by j."ID";
$$;

ALTER FUNCTION "public"."dedup_get_compare_candidates"(bigint) OWNER TO "postgres";