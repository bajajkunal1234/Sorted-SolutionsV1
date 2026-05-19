const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const id = '242dc116-b1db-4122-ac01-9a8f7c351fd9';
    const { data: acc } = await supabase.from('accounts').select('*').eq('id', id).single();
    console.log(acc);
}
run();
