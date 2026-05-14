require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const { data, error } = await supabase.from('quotations').insert([{
        quote_number: 'TEST-123',
        total_amount: 100,
        job_id: 'f064f7df-bbd2-4328-add0-77a34e56598c'
    }]);
    console.log('insert error:', error);
}
run();
