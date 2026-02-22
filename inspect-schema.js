const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting page_settings table...');

    // Query table info from information_schema
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'page_settings'"
    });

    if (error) {
        console.error('Error fetching schema:', error);

        // Fallback: just try to select one row
        console.log('Falling back to direct select...');
        const { data: rows, error: selectError } = await supabase.from('page_settings').select('*').limit(1);
        if (selectError) {
            console.error('Select error:', selectError);
        } else {
            console.log('Sample row structure:', Object.keys(rows[0] || {}).join(', '));
            console.log('Sample data:', JSON.stringify(rows[0], null, 2));
        }
    } else {
        console.log('Columns in page_settings:');
        data.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type})`);
        });
    }
}

inspectSchema();
