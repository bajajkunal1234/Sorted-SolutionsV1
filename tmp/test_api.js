require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testApi() {
    const customerId = '2d89982f-e80b-4f55-b33a-0ab2f7df5f4d';

    const { data: cx } = await supabase.from('customers').select('ledger_id').eq('id', customerId).single()
    const accountId = cx?.ledger_id || customerId
    console.log("Found accountId:", accountId);

    let query = supabase
        .from('jobs')
        .select('*')
        .or(`customer_id.eq.${customerId},customer_id.eq.${accountId}`)
        .order('created_at', { ascending: false })

    const { data: jobs, error } = await query
    
    if (error) {
        console.log("Error querying jobs:", error);
    } else {
        console.log(`Query returned ${jobs.length} jobs.`);
        if (jobs.length > 0) {
            console.log("Job data excerpt:", jobs[0]);
        }
    }
}
testApi();
