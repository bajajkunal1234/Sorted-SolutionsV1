const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeavesTable() {
    console.log('Checking technician_leaves table...');
    const { data, error } = await supabase
        .from('technician_leaves')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error fetching technician_leaves:', error.message);
    } else {
        console.log('Success! Table exists. Data:', data);
    }
}

checkLeavesTable();
