const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Adding whatsapp_preview_url column to print_settings...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS whatsapp_preview_url TEXT;
        `
    });

    if (error) {
        console.error('Error running SQL via exec_sql:', error);
    } else {
        console.log('Successfully ran SQL migration via exec_sql!', data);
        const { data: row, error: fetchError } = await supabase.from('print_settings').select('*').limit(1);
        if (fetchError) {
            console.error('Fetch error:', fetchError);
        } else {
            console.log('New columns in print_settings row:', Object.keys(row[0] || {}));
        }
    }
}

run();
