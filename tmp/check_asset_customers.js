require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAssetCustomers() {
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, type, under')
        .or('type.eq.asset,under.ilike.%customer%,under.ilike.%debtor%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const wrongTypes = accounts.filter(a => a.type !== 'customer');
    const wrongUnder = accounts.filter(a => a.under !== 'sundry-debtors' && a.under !== 'customers');

    console.log(`Total accounts in these groups: ${accounts.length}`);
    console.log(`Accounts with type !== 'customer': ${wrongTypes.length}`);
    console.log(`Accounts with under not 'sundry-debtors' or 'customers': ${wrongUnder.length}`);
    
    // show a few
    console.log("\nSample of wrong types:", wrongTypes.slice(0, 3));
}
checkAssetCustomers();
