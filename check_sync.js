const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSync() {
    const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('*');

    if (accError) {
        console.error('Error fetching accounts:', accError);
        return;
    }

    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*');

    if (custError) {
        console.error('Error fetching customers:', custError);
        return;
    }

    console.log(`Total Accounts: ${accounts.length}`);
    console.log(`Total Customers: ${customers.length}`);

    const missing = accounts.filter(acc => {
        const isCustomerLike = acc.type === 'customer' ||
            (acc.under_name || '').toLowerCase().includes('customer') ||
            (acc.under_name || '').toLowerCase().includes('debtor');

        if (!isCustomerLike) return false;

        const hasCustomer = customers.some(c => c.ledger_id === acc.id);
        return !hasCustomer;
    });

    console.log(`Missing Customers (Account ID, Name, Type, Under):`);
    missing.forEach(m => console.log(`${m.id}, ${m.name}, ${m.type}, ${m.under_name}`));
}

checkSync();
