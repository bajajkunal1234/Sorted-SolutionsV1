const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const sql = "SELECT tgname AS trigger_name, relname AS table_name FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE relname IN ('customers', 'accounts') AND tgisinternal = false";
    console.log('Querying triggers via clean select...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log('Result:', data);
    console.log('Error:', error);
}
run();
