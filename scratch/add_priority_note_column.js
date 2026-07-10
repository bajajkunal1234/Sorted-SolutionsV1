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

async function addColumn() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority_note TEXT;"
    });

    if (error) {
        console.error('Error adding column:', error);
    } else {
        console.log('Success adding priority_note column to jobs table:', data);
    }
}

addColumn();
