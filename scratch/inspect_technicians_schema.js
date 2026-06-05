const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting technicians columns...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'technicians';
        `
    });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Columns:', data);
    }
}

inspectSchema();
