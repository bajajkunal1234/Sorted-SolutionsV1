const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying purchase_invoices columns...');
    const { data: cols, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_invoices'"
    });
    
    if (error) {
        console.error('RPC Error:', error);
        return;
    }
    
    console.log('purchase_invoices columns:', cols);
    
    console.log('Querying sales_invoices columns...');
    const { data: salesCols, error: salesErr } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoices'"
    });
    
    if (salesErr) {
        console.error('RPC Error:', salesErr);
        return;
    }
    
    console.log('sales_invoices columns:', salesCols);
}
run();
