const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    // Check columns for active_amcs
    const { data: cols, error: err1 } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'active_amcs'"
    });
    if (err1) console.error(err1);
    else console.log('Columns in active_amcs:', cols);

    // Check foreign keys for active_amcs
    const { data: fks, error: err2 } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT
                tc.table_schema, 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='active_amcs';
        `
    });
    if (err2) console.error(err2);
    else console.log('Foreign Keys for active_amcs:', fks);
}

inspectSchema();
