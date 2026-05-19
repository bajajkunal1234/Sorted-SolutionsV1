const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying exec_sql definition...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'exec_sql'" });
    console.log('Result:', data);
    console.log('Error:', error);
}
run();
