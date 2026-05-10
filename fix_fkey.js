const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: d1, error: e1 } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE active_amcs DROP CONSTRAINT active_amcs_customer_id_fkey;"
    });
    console.log('Drop constraint:', d1 || e1);

    const { data: d2, error: e2 } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE active_amcs ADD CONSTRAINT active_amcs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES accounts(id) ON DELETE SET NULL;"
    });
    console.log('Add constraint:', d2 || e2);
}
run();
