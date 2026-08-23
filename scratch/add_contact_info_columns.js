const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
ALTER TABLE newera_loans ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE newera_loans ADD COLUMN IF NOT EXISTS address TEXT;
SELECT 'success' AS status;
`;

async function run() {
    console.log('Altering newera_loans table to add contact columns...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Failed to alter newera_loans:', error);
        process.exit(1);
    } else {
        console.log('Table altered successfully:', data);
    }
}

run();
