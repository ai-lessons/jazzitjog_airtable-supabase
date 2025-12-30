-- SQL Audit Script for Shoe Tables
-- Read-only diagnostic queries for public.shoe_results and public.staging_table
-- Run in Supabase SQL Editor to capture current schema, constraints, indexes, and data stats

-- ============================================================================
-- 1. COLUMN INVENTORY
-- ============================================================================
SELECT 'shoe_results' AS table_name,
       column_name,
       data_type,
       udt_name,
       is_nullable,
       column_default,
       character_maximum_length,
       numeric_precision,
       numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'shoe_results'
ORDER BY ordinal_position;

SELECT 'staging_table' AS table_name,
       column_name,
       data_type,
       udt_name,
       is_nullable,
       column_default,
       character_maximum_length,
       numeric_precision,
       numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'staging_table'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CONSTRAINTS
-- ============================================================================
WITH constraint_details AS (
    SELECT
        tc.table_schema,
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns_involved
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
        AND tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('shoe_results', 'staging_table')
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
)
SELECT table_name,
       constraint_name,
       constraint_type,
       columns_involved
FROM constraint_details
ORDER BY table_name, constraint_type, constraint_name;

-- ============================================================================
-- 3. INDEXES
-- ============================================================================
SELECT schemaname AS table_schema,
       tablename AS table_name,
       indexname,
       indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('shoe_results', 'staging_table')
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. ROW COUNTS
-- ============================================================================
SELECT 'shoe_results' AS table_name, COUNT(*) AS row_count FROM public.shoe_results
UNION ALL
SELECT 'staging_table' AS table_name, COUNT(*) AS row_count FROM public.staging_table
ORDER BY table_name;

-- ============================================================================
-- 5. NULL-RATE / FILL STATS FOR IMPORTANT FIELDS
-- ============================================================================
-- Check for existence of each column before querying to avoid errors
-- We'll use a series of conditional checks

-- For shoe_results
DO $$
BEGIN
    -- Check if column exists in shoe_results
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'brand_name') THEN
        RAISE NOTICE 'shoe_results brand_name stats:';
        EXECUTE 'SELECT 
            ''brand_name'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(brand_name) AS non_null_count,
            COUNT(*) - COUNT(brand_name) AS null_count,
            ROUND(COUNT(brand_name) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'model') THEN
        RAISE NOTICE 'shoe_results model stats:';
        EXECUTE 'SELECT 
            ''model'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(model) AS non_null_count,
            COUNT(*) - COUNT(model) AS null_count,
            ROUND(COUNT(model) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'model_key') THEN
        RAISE NOTICE 'shoe_results model_key stats:';
        EXECUTE 'SELECT 
            ''model_key'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(model_key) AS non_null_count,
            COUNT(*) - COUNT(model_key) AS null_count,
            ROUND(COUNT(model_key) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'article_id') THEN
        RAISE NOTICE 'shoe_results article_id stats:';
        EXECUTE 'SELECT 
            ''article_id'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(article_id) AS non_null_count,
            COUNT(*) - COUNT(article_id) AS null_count,
            ROUND(COUNT(article_id) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'source_link') THEN
        RAISE NOTICE 'shoe_results source_link stats:';
        EXECUTE 'SELECT 
            ''source_link'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(source_link) AS non_null_count,
            COUNT(*) - COUNT(source_link) AS null_count,
            ROUND(COUNT(source_link) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'date') THEN
        RAISE NOTICE 'shoe_results date stats:';
        EXECUTE 'SELECT 
            ''date'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(date) AS non_null_count,
            COUNT(*) - COUNT(date) AS null_count,
            ROUND(COUNT(date) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

-- Numeric columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'heel_height') THEN
        RAISE NOTICE 'shoe_results heel_height stats:';
        EXECUTE 'SELECT 
            ''heel_height'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(heel_height) AS non_null_count,
            COUNT(*) - COUNT(heel_height) AS null_count,
            ROUND(COUNT(heel_height) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            ROUND(AVG(heel_height), 2) AS avg_value,
            MIN(heel_height) AS min_value,
            MAX(heel_height) AS max_value
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'forefoot_height') THEN
        RAISE NOTICE 'shoe_results forefoot_height stats:';
        EXECUTE 'SELECT 
            ''forefoot_height'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(forefoot_height) AS non_null_count,
            COUNT(*) - COUNT(forefoot_height) AS null_count,
            ROUND(COUNT(forefoot_height) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            ROUND(AVG(forefoot_height), 2) AS avg_value,
            MIN(forefoot_height) AS min_value,
            MAX(forefoot_height) AS max_value
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'drop') THEN
        RAISE NOTICE 'shoe_results drop stats:';
        EXECUTE 'SELECT 
            ''drop'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(drop) AS non_null_count,
            COUNT(*) - COUNT(drop) AS null_count,
            ROUND(COUNT(drop) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            ROUND(AVG(drop), 2) AS avg_value,
            MIN(drop) AS min_value,
            MAX(drop) AS max_value
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'weight') THEN
        RAISE NOTICE 'shoe_results weight stats:';
        EXECUTE 'SELECT 
            ''weight'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(weight) AS non_null_count,
            COUNT(*) - COUNT(weight) AS null_count,
            ROUND(COUNT(weight) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            ROUND(AVG(weight), 2) AS avg_value,
            MIN(weight) AS min_value,
            MAX(weight) AS max_value
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'price') THEN
        RAISE NOTICE 'shoe_results price stats:';
        EXECUTE 'SELECT 
            ''price'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(price) AS non_null_count,
            COUNT(*) - COUNT(price) AS null_count,
            ROUND(COUNT(price) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            ROUND(AVG(price), 2) AS avg_value,
            MIN(price) AS min_value,
            MAX(price) AS max_value
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'carbon_plate') THEN
        RAISE NOTICE 'shoe_results carbon_plate stats:';
        EXECUTE 'SELECT 
            ''carbon_plate'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(carbon_plate) AS non_null_count,
            COUNT(*) - COUNT(carbon_plate) AS null_count,
            ROUND(COUNT(carbon_plate) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            SUM(CASE WHEN carbon_plate = TRUE THEN 1 ELSE 0 END) AS true_count,
            SUM(CASE WHEN carbon_plate = FALSE THEN 1 ELSE 0 END) AS false_count
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'waterproof') THEN
        RAISE NOTICE 'shoe_results waterproof stats:';
        EXECUTE 'SELECT 
            ''waterproof'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(waterproof) AS non_null_count,
            COUNT(*) - COUNT(waterproof) AS null_count,
            ROUND(COUNT(waterproof) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            SUM(CASE WHEN waterproof = TRUE THEN 1 ELSE 0 END) AS true_count,
            SUM(CASE WHEN waterproof = FALSE THEN 1 ELSE 0 END) AS false_count
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'airtable_id') THEN
        RAISE NOTICE 'shoe_results airtable_id stats:';
        EXECUTE 'SELECT 
            ''airtable_id'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(airtable_id) AS non_null_count,
            COUNT(*) - COUNT(airtable_id) AS null_count,
            ROUND(COUNT(airtable_id) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'record_id') THEN
        RAISE NOTICE 'shoe_results record_id stats:';
        EXECUTE 'SELECT 
            ''record_id'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(record_id) AS non_null_count,
            COUNT(*) - COUNT(record_id) AS null_count,
            ROUND(COUNT(record_id) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent
        FROM public.shoe_results';
    END IF;
END $$;

-- For staging_table specific columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'staging_table' 
                 AND column_name = 'is_edited') THEN
        RAISE NOTICE 'staging_table is_edited stats:';
        EXECUTE 'SELECT 
            ''is_edited'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(is_edited) AS non_null_count,
            COUNT(*) - COUNT(is_edited) AS null_count,
            ROUND(COUNT(is_edited) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            SUM(CASE WHEN is_edited = TRUE THEN 1 ELSE 0 END) AS true_count,
            SUM(CASE WHEN is_edited = FALSE THEN 1 ELSE 0 END) AS false_count
        FROM public.staging_table';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'staging_table' 
                 AND column_name = 'is_running_shoe') THEN
        RAISE NOTICE 'staging_table is_running_shoe stats:';
        EXECUTE 'SELECT 
            ''is_running_shoe'' AS column_name,
            COUNT(*) AS total_rows,
            COUNT(is_running_shoe) AS non_null_count,
            COUNT(*) - COUNT(is_running_shoe) AS null_count,
            ROUND(COUNT(is_running_shoe) * 100.0 / NULLIF(COUNT(*), 0), 2) AS fill_percent,
            SUM(CASE WHEN is_running_shoe = TRUE THEN 1 ELSE 0 END) AS true_count,
            SUM(CASE WHEN is_running_shoe = FALSE THEN 1 ELSE 0 END) AS false_count
        FROM public.staging_table';
    END IF;
END $$;

-- ============================================================================
-- 6. DUPLICATE DIAGNOSTICS
-- ============================================================================

-- Duplicates by (brand_name, model) for shoe_results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'brand_name')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'shoe_results' 
                     AND column_name = 'model') THEN
        RAISE NOTICE 'shoe_results duplicates by (brand_name, model):';
        EXECUTE '
            SELECT 
                brand_name,
                model,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.shoe_results
            WHERE brand_name IS NOT NULL AND model IS NOT NULL
            GROUP BY brand_name, model
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, brand_name, model
            LIMIT 20';
    END IF;
END $$;

-- Duplicates by model_key for shoe_results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'model_key') THEN
        RAISE NOTICE 'shoe_results duplicates by model_key:';
        EXECUTE '
            SELECT 
                model_key,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.shoe_results
            WHERE model_key IS NOT NULL
            GROUP BY model_key
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, model_key
            LIMIT 20';
    END IF;
END $$;

-- Duplicates by current UNIQUE constraint columns (airtable_id, brand_name, model) for shoe_results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'shoe_results' 
                 AND column_name = 'airtable_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'shoe_results' 
                     AND column_name = 'brand_name')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'shoe_results' 
                     AND column_name = 'model') THEN
        RAISE NOTICE 'shoe_results duplicates by UNIQUE constraint (airtable_id, brand_name, model):';
        EXECUTE '
            SELECT 
                airtable_id,
                brand_name,
                model,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.shoe_results
            WHERE airtable_id IS NOT NULL AND brand_name IS NOT NULL AND model IS NOT NULL
            GROUP BY airtable_id, brand_name, model
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, airtable_id, brand_name, model
            LIMIT 20';
    END IF;
END $$;

-- Duplicates by (brand_name, model) for staging_table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'staging_table' 
                 AND column_name = 'brand_name')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'staging_table' 
                     AND column_name = 'model') THEN
        RAISE NOTICE 'staging_table duplicates by (brand_name, model):';
        EXECUTE '
            SELECT 
                brand_name,
                model,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.staging_table
            WHERE brand_name IS NOT NULL AND model IS NOT NULL
            GROUP BY brand_name, model
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, brand_name, model
            LIMIT 20';
    END IF;
END $$;

-- Duplicates by model_key for staging_table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'staging_table' 
                 AND column_name = 'model_key') THEN
        RAISE NOTICE 'staging_table duplicates by model_key:';
        EXECUTE '
            SELECT 
                model_key,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.staging_table
            WHERE model_key IS NOT NULL
            GROUP BY model_key
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, model_key
            LIMIT 20';
    END IF;
END $$;

-- Duplicates by current UNIQUE constraint columns (airtable_id, brand_name, model) for staging_table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
                 AND table_name = 'staging_table' 
                 AND column_name = 'airtable_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'staging_table' 
                     AND column_name = 'brand_name')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                     AND table_name = 'staging_table' 
                     AND column_name = 'model') THEN
        RAISE NOTICE 'staging_table duplicates by UNIQUE constraint (airtable_id, brand_name, model):';
        EXECUTE '
            SELECT 
                airtable_id,
                brand_name,
                model,
                COUNT(*) AS duplicate_count,
                STRING_AGG(id::text, '', '') AS ids,
                MIN(created_at) AS first_created,
                MAX(created_at) AS last_created
            FROM public.staging_table
            WHERE airtable_id IS NOT NULL AND brand_name IS NOT NULL AND model IS NOT NULL
            GROUP BY airtable_id, brand_name, model
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, airtable_id, brand_name, model
            LIMIT 20';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
RAISE NOTICE 'Audit completed for shoe_results and staging_table.';
RAISE NOTICE 'Check the output above for:';
RAISE NOTICE '1. Column inventory';
RAISE NOTICE '2. Constraints';
RAISE NOTICE '3. Indexes';
RAISE NOTICE '4. Row counts';
RAISE NOTICE '5. Null-rate / fill stats';
RAISE NOTICE '6. Duplicate diagnostics';
