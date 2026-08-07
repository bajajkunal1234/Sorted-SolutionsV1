require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAccount() {
    const { data: acc, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', '66e0a9cc-3c80-4304-b2b2-69ca4d839878')
        .maybeSingle();

    console.log('Account row:', acc);
    console.log('Error:', error);
}

checkAccount();
