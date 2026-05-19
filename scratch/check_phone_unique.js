const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check if phone has unique constraint by attempting to insert a customer with an existing phone
    const { data: allCusts } = await supabase.from('customers').select('phone').not('phone', 'eq', '').limit(2);
    if (!allCusts || allCusts.length < 2) {
        console.log('Not enough customers with phone numbers');
        return;
    }
    const phone = allCusts[0].phone;
    console.log('Testing if phone is unique. Existing phone:', phone);
    
    const { data, error } = await supabase.from('customers').insert({
        name: 'Duplicate Phone Test',
        phone: phone
    }).select();

    if (error) {
        console.log('Phone insertion failed. Error code:', error.code, 'Message:', error.message);
    } else {
        console.log('Phone insertion succeeded. Phone is NOT unique in the schema!', data);
        // Clean up
        await supabase.from('customers').delete().eq('id', data[0].id);
    }
}
run();
