const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Testing expense join with both payment_vouchers and technicians...');
    const { data, error } = await supabase
        .from('expenses')
        .select('*, payment_voucher:payment_vouchers(*), technician:technicians(*)')
        .limit(1);
        
    if (error) {
        console.error('Join failed:', error);
    } else {
        console.log('Join succeeded!', data);
    }
}
run();
