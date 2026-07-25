const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('source', 'Website Organic')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log("Recent Enquiries:", JSON.stringify(jobs, null, 2));
}
run();
