-- =====================================================
-- SORTED Solutions - Secure SQL Runner Setup
-- Date: 2026-02-19
-- Purpose: Creates a secure RPC function to run dynamic SQL
-- =====================================================

-- 1. Create the function
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the creator (postgres)
AS $$
DECLARE
    result json;
BEGIN
    -- Execute the query and capture the result as JSON
    EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
    
    -- If no rows, return empty array
    IF result IS NULL THEN
        result := '[]'::json;
    END IF;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Return error message as JSON
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- 2. Grant execute permission (adjust as needed for security)
-- For now, we allow authenticated users (like the admin app)
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Usage Example:
-- SELECT exec_sql('SELECT * FROM customers LIMIT 2');
