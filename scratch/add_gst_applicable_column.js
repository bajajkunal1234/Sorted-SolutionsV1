const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding gst_applicable column to accounts table...');
    // We can use exec_sql to run ALTER TABLE
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT FALSE;'
    });
    
    if (error) {
        console.error('RPC Error:', error);
        return;
    }
    
    console.log('Column added successfully!', data);
}
run();
