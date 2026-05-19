const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const sql = `
        SELECT 
            event_object_table AS table_name,
            trigger_name,
            event_manipulation AS action,
            action_statement AS definition
        FROM 
            information_schema.triggers;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error('Trigger check failed:', error);
    } else {
        console.log('Triggers in database:', data);
    }
}
run();
