const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying customers table for phone numbers similar to 9999883145...');
    const { data: custs1 } = await supabase.from('customers').select('*').ilike('phone', '%99998%');
    console.log('Customers matching 99998:', custs1);

    const { data: custs2 } = await supabase.from('customers').select('*').ilike('phone', '%83145%');
    console.log('Customers matching 83145:', custs2);
}
run();
