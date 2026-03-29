require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanData() {
    const { data: accounts } = await supabase.from('accounts').select('id, name').eq('mobile', '9876543210');
    console.log("Accounts to delete:", accounts);
    
    if (accounts && accounts.length > 0) {
        for (let acc of accounts) {
            // Delete customer row first if exists
            await supabase.from('customers').delete().eq('ledger_id', acc.id);
            await supabase.from('accounts').delete().eq('id', acc.id);
            console.log("Deleted", acc.name);
        }
    }
}
cleanData();
