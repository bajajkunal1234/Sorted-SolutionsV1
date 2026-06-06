const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding handed_to_service_center column to purchase_invoices table...');
    const query = 'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS handed_to_service_center BOOLEAN DEFAULT FALSE';
    
    console.log(`Running: ${query}...`);
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: query
    });
    
    if (error) {
        console.error('Error running query:', error);
        return;
    }
    console.log('Success result:', data);
    console.log('handed_to_service_center column added successfully!');
}

run();
