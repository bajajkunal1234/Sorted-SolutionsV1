const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJob() {
    // Get the most recently updated job
    const { data: job } = await supabase.from('jobs').select('id, customer_id, customer_name').order('updated_at', { ascending: false }).limit(1).single();
    console.log("Job:", job);

    // Look it up in accounts table
    const { data: acc } = await supabase.from('accounts').select('id, name').eq('id', job.customer_id).single();
    console.log("Account matching customer_id:", acc);
}

checkJob();
