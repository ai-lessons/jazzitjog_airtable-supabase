-- Migration 012: Create dedup worker tables
-- This migration creates the foundational tables for the dedup compare worker
-- Tables: dedup_compare_tasks, dedup_delete_log

-- Sequence for dedup_compare_tasks.id
CREATE SEQUENCE IF NOT EXISTS "public"."dedup_compare_tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."dedup_compare_tasks_id_seq" OWNER TO "postgres";

-- Sequence for dedup_delete_log.id
CREATE SEQUENCE IF NOT EXISTS "public"."dedup_delete_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."dedup_delete_log_id_seq" OWNER TO "postgres";

-- Table: dedup_compare_tasks
-- Main task queue for dedup comparison worker
CREATE TABLE IF NOT EXISTS "public"."dedup_compare_tasks" (
    "id" bigint DEFAULT nextval('"public"."dedup_compare_tasks_id_seq"'::regclass) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "group_title" text NOT NULL,
    "article_link" text NOT NULL,
    "row_ids" bigint[] NOT NULL,
    "candidate_count" integer NOT NULL,
    "winner_id" bigint,
    "winner_summary" text,
    "decision_json" jsonb,
    "error_text" text,
    "locked_at" timestamp with time zone,
    "applied_at" timestamp with time zone,
    CONSTRAINT "dedup_compare_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'error'::text, 'approved'::text])))
);

ALTER TABLE "public"."dedup_compare_tasks" OWNER TO "postgres";

-- Table: dedup_delete_log
-- Audit log for dedup deletion decisions
CREATE TABLE IF NOT EXISTS "public"."dedup_delete_log" (
    "id" bigint DEFAULT nextval('"public"."dedup_delete_log_id_seq"'::regclass) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deleted_row_id" bigint NOT NULL,
    "title" text,
    "article_link" text,
    "feed" text,
    "published" text,
    "delete_reason" text NOT NULL,
    "matched_done_row_id" bigint,
    "matched_done_published" text
);

ALTER TABLE "public"."dedup_delete_log" OWNER TO "postgres";

-- Primary key constraints
ALTER TABLE ONLY "public"."dedup_compare_tasks"
    ADD CONSTRAINT "dedup_compare_tasks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."dedup_delete_log"
    ADD CONSTRAINT "dedup_delete_log_pkey" PRIMARY KEY ("id");

-- Ownership relationships
ALTER SEQUENCE "public"."dedup_compare_tasks_id_seq" OWNED BY "public"."dedup_compare_tasks"."id";
ALTER SEQUENCE "public"."dedup_delete_log_id_seq" OWNED BY "public"."dedup_delete_log"."id";

-- Permissions
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dedup_compare_tasks" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."dedup_compare_tasks_id_seq" TO "service_role";

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dedup_delete_log" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."dedup_delete_log_id_seq" TO "service_role";