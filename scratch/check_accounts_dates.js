const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying table information for accounts...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts'"
    });
    if (error) {
        console.error('Error fetching columns:', error);
    } else {
        console.log(data.filter(c => c.data_type.includes('date') || c.data_type.includes('time')));
    }
}
run();
