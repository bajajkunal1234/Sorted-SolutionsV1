const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const ledgerId = '291ff82e-f068-408c-9aca-c21164477b05';
    const { data: acc } = await supabase.from('accounts').select('*').eq('id', ledgerId).single();
    console.log('In accounts table:', acc);
}
run();
