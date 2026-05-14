require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY }
    });
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'quotations' });
    console.log(data, error);
}
run();
