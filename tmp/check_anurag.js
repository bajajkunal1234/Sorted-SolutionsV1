require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // Find all accounts with 'anurag'
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('name, type, under, mobile, phone')
        .ilike('name', '%anurag%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found Anurag accounts:");
    console.log(accounts);
}
check();
