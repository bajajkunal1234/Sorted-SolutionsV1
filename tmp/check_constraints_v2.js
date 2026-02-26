
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://oqwvbwaqcdbggcqvzswv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    const sql = `
    SELECT
        tc.constraint_name,
        tc.table_name as referencing_table,
        kcu.column_name as referencing_column,
        rc.delete_rule
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
          AND rc.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'website_brands';
  `;

    // Use the exec_sql RPC which should be available from previous work (Conversation 4d2fcca6)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error running SQL:', error);
        process.exit(1);
    }

    console.log('--- FOREIGN KEY CONSTRAINTS REFERENCING website_brands ---');
    if (data && data.length > 0) {
        console.table(data);
    } else {
        console.log('No constraints found.');
    }
}

checkConstraints();
