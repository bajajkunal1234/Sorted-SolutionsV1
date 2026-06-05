const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Running migration to add payment_voucher_id column to expenses table...');
    const sql = `
        ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS payment_voucher_id uuid REFERENCES payment_vouchers(id) ON DELETE SET NULL;
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
