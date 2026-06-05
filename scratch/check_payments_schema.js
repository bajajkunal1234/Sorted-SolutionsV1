const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying first payment voucher...');
    const { data, error } = await supabase.from('payment_vouchers').select('*').limit(1);
    if (error) {
        console.error('Error fetching payment voucher:', error);
    } else {
        if (data && data[0]) {
            console.log('All columns in payment_vouchers table:', Object.keys(data[0]));
            console.log('Sample payment voucher:', data[0]);
        } else {
            console.log('No payment vouchers found, printing column names via metadata RPC if possible...');
            const { data: cols } = await supabase.rpc('exec_sql', {
                sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_vouchers'"
            });
            console.log(cols);
        }
    }
}
run();
