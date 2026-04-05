require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('name, type, under')
        .eq('type', 'customer')
        .eq('under', 'customers');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${accounts.length} accounts with type='customer' and under='customers'`);
    if (accounts.length > 0) {
        console.log("Sample:", accounts.slice(0, 5));
    }
}
check();
