const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
            id,
            job_number,
            property,
            property_id,
            customer_id,
            customer:accounts(*)
        `)
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Found", jobs.length, "jobs.");
    jobs.forEach(j => {
        console.log(`\n--- Job: ${j.job_number} ---`);
        console.log("Job Property Field:", JSON.stringify(j.property));
        console.log("Job Property ID:", j.property_id);
        console.log("Customer properties field type:", Array.isArray(j.customer?.properties) ? `Array (length ${j.customer.properties.length})` : typeof j.customer?.properties);
        if (j.customer?.properties && j.customer.properties.length > 0) {
            console.log("First property in customer:", JSON.stringify(j.customer.properties[0]));
        }
    });
}

run();
