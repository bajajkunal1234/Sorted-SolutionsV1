const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: cust } = await supabase.from('customers').select('*').limit(1);
    if (cust && cust[0]) {
        console.log('All keys in customers table:', Object.keys(cust[0]));
        console.log('Sample customer object:', cust[0]);
    }
}
run();
