const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Dropping temporary test table...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "DROP TABLE IF EXISTS newera_test_table; SELECT 'success' as status;"
    });
    if (error) {
        console.error('Failed to drop test table:', error);
    } else {
        console.log('Cleaned up test table successfully:', data);
    }
}

run();
