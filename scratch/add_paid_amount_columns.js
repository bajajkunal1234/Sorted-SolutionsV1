const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
    console.log('Adding paid_amount column to sales_invoices and purchase_invoices...');

    const { data: data1, error: error1 } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;"
    });

    if (error1) {
        console.error('Error adding to sales_invoices:', error1);
    } else {
        console.log('Successfully added paid_amount to sales_invoices.');
    }

    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;"
    });

    if (error2) {
        console.error('Error adding to purchase_invoices:', error2);
    } else {
        console.log('Successfully added paid_amount to purchase_invoices.');
    }
}
updateSchema();
