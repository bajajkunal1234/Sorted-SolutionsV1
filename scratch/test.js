require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('quotations').select('*').limit(5);
    console.log('quotations:', data?.length, error);
    
    const { data: txData, error: txError } = await supabase.from('transactions').select('*').limit(5);
    console.log('transactions:', txData?.length, txError);
}
run();
