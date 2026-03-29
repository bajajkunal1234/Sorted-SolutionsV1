require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching by phone 8922944635...");
    const { data: custs } = await supabase.from('customers').select('*').eq('phone', '8922944635');
    console.log("Customers:", custs);

    console.log("Fetching by phone 9799120292...");
    const { data: custs2 } = await supabase.from('customers').select('*').eq('phone', '9799120292');
    console.log("Customers Gaurav:", custs2);
}
run();
