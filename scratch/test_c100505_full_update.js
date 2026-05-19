const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const id = '242dc116-b1db-4122-ac01-9a8f7c351fd9';
    console.log('Fetching Juhu Customer current state...');
    const { data: before } = await supabase.from('accounts').select('*').eq('id', id).single();

    const updates = {
        ...before,
        name: 'Juhu Customer Test Name'
    };

    console.log('Simulating full upsert on customers table...');
    const { data: custData, error: custErr } = await supabase.from('customers').upsert({
        name: updates.name,
        phone: updates.mobile || '',
        email: updates.email || '',
        gstin: updates.gstin || '',
        address: updates.mailing_address || {},
        properties: updates.properties || [],
        ledger_id: id
    }, { onConflict: 'ledger_id' }).select();

    if (custErr) {
        console.error('Customer upsert failed with error:', custErr);
    } else {
        console.log('Customer upsert succeeded:', custData);
        // Clean up immediately
        const { error: delErr } = await supabase.from('customers').delete().eq('ledger_id', id);
        console.log('Cleanup result:', delErr ? delErr : 'Success');
    }
}
run();
