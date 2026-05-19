const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: acc } = await supabase.from('accounts').select('*').eq('sku', 'C100505').single();
    console.log('Account C100505 all details:', acc);
}
run();
