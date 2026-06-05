const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding category column to purchase_invoices table...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS category TEXT;'
    });
    
    if (error) {
        console.error('RPC Error:', error);
        return;
    }
    
    console.log('Column added successfully!', data);
}
run();
