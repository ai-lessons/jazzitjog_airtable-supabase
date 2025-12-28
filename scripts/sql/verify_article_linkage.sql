-- Verification queries for article_id linkage

-- 1. Total rows in shoe_results
SELECT COUNT(*) AS total_shoe_results FROM shoe_results;

-- 2. Rows with article_id (text)
SELECT COUNT(*) AS rows_with_article_id 
FROM shoe_results 
WHERE article_id IS NOT NULL;

-- 3. Rows with article_id_int
SELECT COUNT(*) AS rows_with_article_id_int 
FROM shoe_results 
WHERE article_id_int IS NOT NULL;

-- 4. Rows that successfully join to JazzItJog_db.ID
SELECT COUNT(*) AS matching_article_ids
FROM shoe_results sr
JOIN "JazzItJog_db" jj ON sr.article_id_int = jj."ID";

-- 5. Rows that do NOT match
SELECT COUNT(*) AS unmatched_article_ids
FROM shoe_results sr
LEFT JOIN "JazzItJog_db" jj ON sr.article_id_int = jj."ID"
WHERE jj."ID" IS NULL AND sr.article_id_int IS NOT NULL;
