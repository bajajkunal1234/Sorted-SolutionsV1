const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS newera_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

SELECT 'success' AS status;
`;

async function run() {
    console.log('Creating newera_interactions table in Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Failed to create newera_interactions:', error);
        process.exit(1);
    } else {
        console.log('Table created successfully:', data);
    }
}

run();
