const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Deleting test customer record to return to user state...');
    const { data, error } = await supabase.from('customers').delete().eq('id', '49d33201-306a-4f83-ba00-ca6862ea52ae');
    if (error) console.error(error);
    else console.log('Successfully deleted!');
}
run();
