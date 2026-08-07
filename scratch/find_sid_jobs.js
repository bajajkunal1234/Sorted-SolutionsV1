require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findJobs() {
    // Search jobs by customer_name or customer_id
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .or('customer_name.ilike.%sid%,customer_name.ilike.%chauhan%');
    
    console.log('Matching Jobs:', jobs);
    console.log('Error:', error);
}

findJobs();
