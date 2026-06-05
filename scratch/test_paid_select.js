const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaid() {
    const { data, error } = await supabase.from('sales_invoices').select('id, paid_amount').limit(1);
    if (error) {
        console.error('Error selecting paid_amount:', error);
    } else {
        console.log('Success, data:', data);
    }
}
testPaid();
