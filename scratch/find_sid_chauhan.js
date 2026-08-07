require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findSid() {
    console.log('Searching for Sid Chauhan...');

    // 1. Search accounts
    const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .ilike('name', '%chauhan%');
    console.log('Accounts match:', accounts);

    // 2. Search customers
    const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%chauhan%');
    console.log('Customers match:', customers);

    // 3. Search lead_attributions
    const { data: leads, error: leadErr } = await supabase
        .from('lead_attributions')
        .select('*')
        .ilike('name', '%chauhan%');
    console.log('Leads match:', leads);
}

findSid();
