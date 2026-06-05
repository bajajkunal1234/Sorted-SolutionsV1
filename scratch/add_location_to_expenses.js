const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addLocationColumns() {
    console.log('Running migration to add location columns to expenses...');
    const sql = `
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS latitude double precision;
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS longitude double precision;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log('Migration completed successfully!', data);
    }
}

addLocationColumns();
