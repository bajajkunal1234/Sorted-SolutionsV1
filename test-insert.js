require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/"/g, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/"/g, '');
const supabase = createClient(url, key);

async function run() {
    // 1. Get a valid account ID and job ID
    const { data: accounts } = await supabase.from('accounts').select('id').limit(1);
    const validAccountId = accounts[0].id;
    
    const { data: jobs } = await supabase.from('jobs').select('id').limit(1);
    const validJobId = jobs[0].id;
    
    console.log("Testing with Account:", validAccountId, "Job:", validJobId);
    
    // 2. Try inserting an interaction using this account ID
    const payload = {
        job_id: validJobId,
        customer_id: validAccountId,
        type: 'test-insert',
        category: 'communication',
        description: 'Testing FK constraint',
        timestamp: new Date().toISOString(),
        source: 'Script'
    };
    
    const { data: insertData, error: insertError } = await supabase
        .from('interactions')
        .insert(payload);
        
    console.log("Insert Result:", insertError ? insertError.message : "Success");
}
run();

