const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding sound column to notification_triggers table...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE notification_triggers ADD COLUMN IF NOT EXISTS sound TEXT DEFAULT 'default';"
    });
    
    if (error) {
        console.error('RPC Error:', error);
        return;
    }
    
    console.log('Sound column added successfully!', data);
}
run();
