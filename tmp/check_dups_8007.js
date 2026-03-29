require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDups() {
    const { data: custs } = await supabase.from('customers').select('*').eq('phone', '8007889260');
    console.log("Customers with 8007889260:", custs.map(c => ({id: c.id, ledger_id: c.ledger_id, created_at: c.created_at})));

    const { data: accs } = await supabase.from('accounts').select('*').eq('mobile', '8007889260');
    console.log("Accounts with 8007889260:", accs.map(a => ({id: a.id, name: a.name, created_at: a.created_at})));
}
checkDups();
