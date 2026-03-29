require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBhavesh() {
    const { data: jobs, error } = await supabase.from('jobs').select('*');
    if (error) {
        console.error("Error fetching jobs:", error);
    } else {
        const matches = jobs.filter(j => 
            (j.customer_name && j.customer_name.toLowerCase().includes('bhavesh')) || 
            (j.customer_id === '2d89982f-e80b-4f55-b33a-0ab2f7df5f4d') || 
            (j.customer_id === '1d7a097b-16f3-463e-a0bf-65caa7f13620')
        );
        console.log(`Found ${matches.length} matching jobs manually in JS:`);
        for (let j of matches) {
            console.log(`Job ${j.job_number} | ID: ${j.id} | cust_id: ${j.customer_id} | name: ${j.customer_name}`);
        }
    }
}
checkBhavesh();
