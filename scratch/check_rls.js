require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: "select schemaname, tablename, policyname, cmd, qual from pg_policies where tablename in ('lead_attributions', 'google_ads_daily_metrics')"
    });
    console.log('Result:', data);
    console.log('Error:', error);
}

checkPolicies();
