-- Migration 016: Add unique constraint for dedup_compare_tasks table
-- This migration adds the unique constraint required by dedup_enqueue_compare_tasks()
-- for its ON CONFLICT (group_title, article_link, row_ids) clause
-- Exact constraint name and definition from remote_public_schema.sql

-- Add unique constraint to dedup_compare_tasks table
-- This enables dedup_enqueue_compare_tasks() to use ON CONFLICT clause for deduplication
ALTER TABLE ONLY "public"."dedup_compare_tasks"
    ADD CONSTRAINT "dedup_compare_tasks_group_title_article_link_row_ids_key" 
    UNIQUE ("group_title", "article_link", "row_ids");
