const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = require('dotenv').config({ path: envPath });

if (envConfig.error) {
    console.error('Error loading .env.local:', envConfig.error);
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon key, hoping RLS allows or we have permissions

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase Setup Error: Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
    const sql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        -- Check if it's a SELECT or WITH query to decide how to execute
        IF lower(trim(sql_query)) LIKE 'select%' OR lower(trim(sql_query)) LIKE 'with%' THEN
            EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
            
            -- If no rows, return empty array
            IF result IS NULL THEN
                result := '[]'::json;
            END IF;
        ELSE
            -- For INSERT, UPDATE, DELETE, ALTER, CREATE, etc.
            EXECUTE sql_query;
            result := '{"status": "success", "message": "Command executed successfully"}'::json;
        END IF;
        
        RETURN result;
    EXCEPTION WHEN OTHERS THEN
        -- Return error message as JSON
        RETURN json_build_object('error', SQLERRM);
    END;
    $$;
    `;

    console.log('Applying exec_sql fix...');

    // We try to use the RPC itself to update itself?? 
    // No, if the RPC is broken for DDL, we can't use it to fix itself.
    // But... the previous version WAS broken for DDL.
    // So this script MIGHT fail if we use the API route.
    // BUT, we are using the supabase client here. 
    // The supabase client usually runs queries via PostgREST, which doesn't allow raw SQL execution unless via an RPC.

    // So we seem to be in a "Chicken and Egg" situation. 
    // If the USER ran the migration and it said "Success", maybe they fixed it?
    // Or maybe they ran it in the Supabase Dashboard.

    // Let's try to run a simple SELECT to check if the function works at all.
    const checkQuery = "SELECT 1 as test";
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: checkQuery });

    if (error) {
        console.error('Current RPC Check Failed:', error);
    } else {
        console.log('Current RPC Check Success:', data);
    }
}

applyFix();
