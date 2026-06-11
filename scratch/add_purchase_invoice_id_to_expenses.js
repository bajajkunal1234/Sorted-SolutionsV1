const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Running migration to add purchase_invoice_id column to expenses table...');
    const sql = `
        ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE SET NULL;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Migration succeeded!', data);
        
        // Verify columns in expenses table now
        const { data: cols } = await supabase.rpc('exec_sql', {
            sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'expenses'"
        });
        console.log('Current columns in expenses table:', cols);
    }
}
run();
