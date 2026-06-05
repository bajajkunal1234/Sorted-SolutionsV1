const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAllocations() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_voucher_allocations'"
    });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns in payment_voucher_allocations:');
        data.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
    }
}
inspectAllocations();
