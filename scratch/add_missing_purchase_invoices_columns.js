const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding missing columns to purchase_invoices table...');
    const queries = [
        'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS po_reference TEXT',
        'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS vendor_invoice_number TEXT',
        'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS account_phone TEXT',
        'ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS account_email TEXT'
    ];
    
    for (const q of queries) {
        console.log(`Running: ${q}...`);
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: q
        });
        if (error) {
            console.error(`Error running ${q}:`, error);
            return;
        }
        console.log('Result:', data);
    }
    
    console.log('All missing columns added successfully!');
}
run();
