const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const id = '242dc116-b1db-4122-ac01-9a8f7c351fd9';
    console.log('Fetching accounts table row...');
    const { data: acc } = await supabase.from('accounts').select('*').eq('id', id).single();
    console.log('Accounts table:', { id: acc.id, name: acc.name, mobile: acc.mobile });

    console.log('Fetching customers table row...');
    const { data: cust } = await supabase.from('customers').select('*').eq('ledger_id', id).maybeSingle();
    console.log('Customers table:', cust ? { id: cust.id, name: cust.name, phone: cust.phone } : 'NOT FOUND');
}
run();
