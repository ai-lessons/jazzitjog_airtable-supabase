-- Migration 015: Create repeats_jij_last45_actions view
-- This migration creates the view that identifies duplicate detection and deletion candidates
-- from the last 45 rows of JazzItJog_db
-- Required by: dedup_enqueue_compare_tasks() and dedup_log_delete_candidates()

CREATE OR REPLACE VIEW "public"."repeats_jij_last45_actions" AS
 WITH "win" AS (
         SELECT "t"."ID",
            "t"."Feed",
            "t"."Summary_published",
            "t"."New Title",
            "t"."Article link",
            "t"."Title",
            "t"."Published"
           FROM "public"."JazzItJog_db" "t"
          WHERE (("t"."Title" IS NOT NULL) AND ("t"."Article link" IS NOT NULL))
          ORDER BY "t"."ID" DESC
         LIMIT 45
        ), "norm" AS (
         SELECT "w"."ID",
            "w"."Feed",
            "w"."Summary_published",
            "w"."New Title",
            "w"."Article link",
            "w"."Title",
            "w"."Published",
            "regexp_replace"("lower"(TRIM(BOTH FROM "w"."Title")), '\s+'::"text", ' '::"text", 'g'::"text") AS "title_norm",
            "regexp_replace"("regexp_replace"("w"."Article link", '\?.*$'::"text", ''::"text"), '/+$'::"text", ''::"text") AS "link_norm"
           FROM "win" "w"
        ), "keyed" AS (
         SELECT "n"."ID",
            "n"."Feed",
            "n"."Summary_published",
            "n"."New Title",
            "n"."Article link",
            "n"."Title",
            "n"."Published",
            "n"."title_norm",
            "n"."link_norm",
            "md5"(((COALESCE("n"."title_norm", ''::"text") || '|'::"text") || COALESCE("n"."link_norm", ''::"text"))) AS "dup_key"
           FROM "norm" "n"
        ), "null_ranks" AS (
         SELECT "k"."dup_key",
            "k"."ID",
            "row_number"() OVER (PARTITION BY "k"."dup_key" ORDER BY "k"."ID") AS "repeat_rank_null"
           FROM "keyed" "k"
          WHERE ("k"."Published" IS NULL)
        ), "stats" AS (
         SELECT "keyed"."dup_key",
            "min"("keyed"."ID") AS "group_min_id_window",
            "count"(*) AS "cnt_window",
            "count"(*) FILTER (WHERE ("keyed"."Published" IS NULL)) AS "cnt_null_window",
            "bool_or"(("right"(COALESCE("keyed"."Feed", ''::"text"), 3) = '+++'::"text")) AS "has_feed_winner_window"
           FROM "keyed"
          GROUP BY "keyed"."dup_key"
        ), "done_keys" AS (
         SELECT DISTINCT "md5"(((COALESCE("regexp_replace"("lower"(TRIM(BOTH FROM "t"."Title")), '\s+'::"text", ' '::"text", 'g'::"text"), ''::"text") || '|'::"text") || COALESCE("regexp_replace"("regexp_replace"("t"."Article link", '\?.*$'::"text", ''::"text"), '/+$'::"text", ''::"text"), ''::"text"))) AS "dup_key"
           FROM "public"."JazzItJog_db" "t"
          WHERE (("t"."Published" = 'Done'::"text") AND ("t"."Title" IS NOT NULL) AND ("t"."Article link" IS NOT NULL))
        ), "marked" AS (
         SELECT "k"."ID",
            "k"."Feed",
            "k"."Summary_published",
            "k"."New Title",
            "k"."Article link",
            "k"."Title",
            "k"."Published",
            "k"."title_norm",
            "k"."link_norm",
            "k"."dup_key",
            "s"."cnt_window",
            "s"."cnt_null_window",
            "s"."group_min_id_window",
            "s"."has_feed_winner_window",
            ("d"."dup_key" IS NOT NULL) AS "has_done_any",
            "dense_rank"() OVER (ORDER BY "s"."group_min_id_window") AS "group_no",
            "nr"."repeat_rank_null"
           FROM ((("keyed" "k"
             JOIN "stats" "s" USING ("dup_key"))
             LEFT JOIN "done_keys" "d" USING ("dup_key"))
             LEFT JOIN "null_ranks" "nr" ON ((("nr"."dup_key" = "k"."dup_key") AND ("nr"."ID" = "k"."ID"))))
        ), "final" AS (
         SELECT "m"."ID",
            "m"."Feed",
                CASE
                    WHEN ((NOT "m"."has_done_any") AND (NOT "m"."has_feed_winner_window") AND ("m"."cnt_null_window" > 1) AND ("m"."Published" IS NULL)) THEN (((("chr"(((65 + (("m"."group_no" - 1) % (26)::bigint)))::integer) || ' '::"text") || ("m"."repeat_rank_null")::"text") || '/'::"text") || ("m"."cnt_null_window")::"text")
                    ELSE NULL::"text"
                END AS "repeat_pos",
            "m"."Title" AS "_group_title",
            "m"."Article link",
            "m"."Summary_published",
            "m"."New Title",
            "m"."Published",
            "m"."has_done_any",
            "m"."has_feed_winner_window",
            "m"."cnt_null_window",
                CASE
                    WHEN ("m"."has_done_any" AND ("m"."Published" IS NULL)) THEN 'DELETE'::"text"
                    WHEN ((NOT "m"."has_done_any") AND (NOT "m"."has_feed_winner_window") AND ("m"."cnt_null_window" > 1) AND ("m"."Published" IS NULL)) THEN 'COMPARE'::"text"
                    ELSE 'IGNORE'::"text"
                END AS "action"
           FROM "marked" "m"
        )
 SELECT "ID",
    "Feed",
    "repeat_pos",
    "_group_title",
    "Article link",
    "Summary_published",
    "New Title",
    "Published",
    "has_done_any",
    "has_feed_winner_window",
    "cnt_null_window",
    "action"
   FROM "final"
  WHERE ("action" = ANY (ARRAY['DELETE'::"text", 'COMPARE'::"text"]))
  ORDER BY "action" DESC, "_group_title", "ID";

ALTER VIEW "public"."repeats_jij_last45_actions" OWNER TO "postgres";