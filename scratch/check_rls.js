require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    const { data: rawData, error: rawErr } = await supabase.rpc('exec_sql', { sql_query: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'lead_attributions';
    ` });
    console.log('Raw SQL data:', rawData);
    console.log('Raw SQL error:', rawErr);
}

checkPolicies();
