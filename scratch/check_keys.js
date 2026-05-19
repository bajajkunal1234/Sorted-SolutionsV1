const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying first account keys...');
    const { data: acc } = await supabase.from('accounts').select('*').limit(1);
    if (acc && acc[0]) {
        console.log('All keys in accounts table:', Object.keys(acc[0]));
        console.log('Sample account object:', acc[0]);
    }
}
run();
