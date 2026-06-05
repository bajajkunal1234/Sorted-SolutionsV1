const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching technician_leaves using standard client...');
    const { data, error } = await supabase
        .from('technician_leaves')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success! Data:', data);
    }
}

run();
