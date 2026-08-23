const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding alternate_mobile column to accounts...');
    const r1 = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS alternate_mobile text;'
    });
    console.log('Result accounts:', r1);

    console.log('Adding alternate_mobile column to customers...');
    const r2 = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_mobile text;'
    });
    console.log('Result customers:', r2);
}

run();
