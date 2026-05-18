const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying accounts table for SKU C100519...');
    const { data: acc, error: err1 } = await supabase.from('accounts').select('*').eq('sku', 'C100519').single();
    if (err1) console.error(err1);
    else console.log('Account in DB:', { id: acc.id, name: acc.name, contact_person: acc.contact_person, mailing_name: acc.mailing_name });

    if (acc) {
        console.log('Querying customers table for ledger_id:', acc.id);
        const { data: cust, error: err2 } = await supabase.from('customers').select('*').eq('ledger_id', acc.id);
        if (err2) console.error(err2);
        else console.log('Customers linked to this account:', cust);
    }
}
run();
