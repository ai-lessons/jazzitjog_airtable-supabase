-- Create RPC function to count matching article IDs
CREATE OR REPLACE FUNCTION count_matching_article_ids()
RETURNS BIGINT AS $$
DECLARE
    matching_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO matching_count
    FROM shoe_results sr
    JOIN "JazzItJog_db" jj ON sr.article_id_int = jj."ID";
    
    RETURN matching_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to count unmatched article IDs
CREATE OR REPLACE FUNCTION count_unmatched_article_ids()
RETURNS BIGINT AS $$
DECLARE
    unmatched_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO unmatched_count
    FROM shoe_results sr
    LEFT JOIN "JazzItJog_db" jj ON sr.article_id_int = jj."ID"
    WHERE jj."ID" IS NULL AND sr.article_id_int IS NOT NULL;
    
    RETURN unmatched_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated and service_role users
GRANT EXECUTE ON FUNCTION count_matching_article_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_unmatched_article_ids() TO authenticated, service_role;
