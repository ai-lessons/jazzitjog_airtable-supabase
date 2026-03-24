-- Migration 014: Create dedup prepare helper functions
-- This migration creates the helper functions required by the dedup compare worker prepare stage
-- Functions: prepare_compare_cycle, enqueue_compare_tasks, requeue_stale_compare_tasks, log_delete_candidates

-- Function: dedup_requeue_stale_compare_tasks
-- Resets stale processing tasks back to pending status
CREATE OR REPLACE FUNCTION "public"."dedup_requeue_stale_compare_tasks"("p_stale_minutes" integer DEFAULT 30) 
RETURNS integer
LANGUAGE "plpgsql"
AS $$
declare
  v_updated integer;
begin
  update public.dedup_compare_tasks
  set status = 'pending'
  where status = 'processing'
    and locked_at is not null
    and locked_at < now() - make_interval(mins => p_stale_minutes);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

ALTER FUNCTION "public"."dedup_requeue_stale_compare_tasks"(integer) OWNER TO "postgres";

-- Function: dedup_enqueue_compare_tasks
-- Populates compare tasks from repeats_jij_last45_actions view
-- DEPENDENCY: Requires public.repeats_jij_last45_actions view to exist
CREATE OR REPLACE FUNCTION "public"."dedup_enqueue_compare_tasks"() 
RETURNS integer
LANGUAGE "plpgsql"
AS $$
declare
  v_inserted integer;
begin
  with ins as (
    insert into public.dedup_compare_tasks (
      group_title,
      article_link,
      row_ids,
      candidate_count
    )
    select
      "_group_title" as group_title,
      "Article link" as article_link,
      array_agg("ID" order by "ID") as row_ids,
      count(*)::int as candidate_count
    from public.repeats_jij_last45_actions
    where action = 'COMPARE'
    group by "_group_title", "Article link"
    on conflict (group_title, article_link, row_ids) do nothing
    returning 1
  )
  select count(*) into v_inserted
  from ins;

  return v_inserted;
end;
$$;

ALTER FUNCTION "public"."dedup_enqueue_compare_tasks"() OWNER TO "postgres";

-- Function: dedup_log_delete_candidates
-- Logs deletion candidates from repeats_jij_last45_actions to dedup_delete_log
-- DEPENDENCY: Requires public.repeats_jij_last45_actions view to exist
CREATE OR REPLACE FUNCTION "public"."dedup_log_delete_candidates"() 
RETURNS integer
LANGUAGE "plpgsql"
AS $_$
declare
  v_inserted integer;
begin
  with delete_rows as (
    select
      r."ID" as deleted_row_id,
      r."_group_title" as title,
      r."Article link" as article_link,
      r."Feed" as feed,
      r."Published" as published
    from public.repeats_jij_last45_actions r
    where r.action = 'DELETE'
  ),
  matched as (
    select
      d.deleted_row_id,
      d.title,
      d.article_link,
      d.feed,
      d.published,
      j."ID" as matched_done_row_id,
      j."Published" as matched_done_published,
      'Duplicate of already published article within dedup window'::text as delete_reason
    from delete_rows d
    left join lateral (
      select j2."ID", j2."Published"
      from public."JazzItJog_db" j2
      where j2."Published" = 'Done'
        and regexp_replace(lower(trim(j2."Title")), '\s+', ' ', 'g')
            = regexp_replace(lower(trim(d.title)), '\s+', ' ', 'g')
        and regexp_replace(regexp_replace(j2."Article link", '\?.*$', ''), '/+$', '')
            = regexp_replace(regexp_replace(d.article_link, '\?.*$', ''), '/+$', '')
      order by j2."ID" desc
      limit 1
    ) j on true
  ),
  ins as (
    insert into public.dedup_delete_log (
      deleted_row_id,
      title,
      article_link,
      feed,
      published,
      delete_reason,
      matched_done_row_id,
      matched_done_published
    )
    select
      m.deleted_row_id,
      m.title,
      m.article_link,
      m.feed,
      m.published,
      m.delete_reason,
      m.matched_done_row_id,
      m.matched_done_published
    from matched m
    on conflict (deleted_row_id) do nothing
    returning 1
  )
  select count(*) into v_inserted
  from ins;

  return v_inserted;
end;
$_$;

ALTER FUNCTION "public"."dedup_log_delete_candidates"() OWNER TO "postgres";

-- Function: dedup_prepare_compare_cycle
-- Orchestrator function that prepares a dedup compare cycle by:
-- 1. Requeuing stale processing tasks
-- 2. Enqueuing new compare tasks from repeats_jij_last45_actions
-- 3. Logging delete candidates
CREATE OR REPLACE FUNCTION "public"."dedup_prepare_compare_cycle"("p_stale_minutes" integer DEFAULT 30) 
RETURNS TABLE("requeued_count" integer, "enqueued_count" integer, "delete_logged_count" integer)
LANGUAGE "plpgsql"
AS $$
declare
  v_requeued integer;
  v_enqueued integer;
  v_delete_logged integer;
begin
  select public.dedup_requeue_stale_compare_tasks(p_stale_minutes)
  into v_requeued;

  select public.dedup_enqueue_compare_tasks()
  into v_enqueued;

  select public.dedup_log_delete_candidates()
  into v_delete_logged;

  return query
  select v_requeued, v_enqueued, v_delete_logged;
end;
$$;

ALTER FUNCTION "public"."dedup_prepare_compare_cycle"(integer) OWNER TO "postgres";