const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const q1 = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts'`;
    const q2 = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers'`;
    
    const r1 = await supabase.rpc('exec_sql', { sql_query: q1 });
    const r2 = await supabase.rpc('exec_sql', { sql_query: q2 });
    
    console.log('--- Accounts columns ---');
    console.log(r1.data);
    console.log('--- Customers columns ---');
    console.log(r2.data);
}

run();
