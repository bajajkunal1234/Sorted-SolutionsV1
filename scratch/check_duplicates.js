const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying for phone number: 9745639988...\n');

    // 1. Check in accounts table
    const { data: accounts, error: err1 } = await supabase
        .from('accounts')
        .select('id, name, sku, mobile, email, status, under, created_at');

    if (err1) {
        console.error('Error fetching accounts:', err1);
    } else {
        const matches = accounts.filter(acc => {
            if (!acc.mobile) return false;
            const digits = acc.mobile.replace(/\D/g, '');
            return digits === '9745639988' || digits === '919745639988' || digits.endsWith('9745639988');
        });
        console.log(`--- MATCHING ACCOUNTS IN 'accounts' TABLE (${matches.length}) ---`);
        console.log(matches);
    }

    // 2. Check in customers table
    const { data: customers, error: err2 } = await supabase
        .from('customers')
        .select('id, name, phone, email, created_at');

    if (err2) {
        console.error('Error fetching customers:', err2);
    } else {
        const matches = customers.filter(cust => {
            if (!cust.phone) return false;
            const digits = cust.phone.replace(/\D/g, '');
            return digits === '9745639988' || digits === '919745639988' || digits.endsWith('9745639988');
        });
        console.log(`\n--- MATCHING CUSTOMERS IN 'customers' TABLE (${matches.length}) ---`);
        console.log(matches);
    }

    // 3. Find other duplicate numbers in accounts
    if (accounts) {
        const phoneGroups = {};
        accounts.forEach(acc => {
            if (!acc.mobile) return;
            // Get normalized 10 digits
            let digits = acc.mobile.replace(/\D/g, '');
            if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
            if (digits.length === 10) {
                if (!phoneGroups[digits]) phoneGroups[digits] = [];
                phoneGroups[digits].push(acc);
            }
        });

        const duplicates = Object.entries(phoneGroups).filter(([phone, list]) => list.length > 1);
        console.log(`\n--- ALL DUPLICATE MOBILE NUMBERS IN 'accounts' (${duplicates.length}) ---`);
        duplicates.slice(0, 10).forEach(([phone, list]) => {
            console.log(`Phone: ${phone} (shared by ${list.length} accounts):`);
            list.forEach(a => console.log(`  - SKU: ${a.sku}, Name: "${a.name}", Under: "${a.under}"`));
        });
        if (duplicates.length > 10) {
            console.log(`... and ${duplicates.length - 10} more duplicate numbers.`);
        }
    }
}

run();
