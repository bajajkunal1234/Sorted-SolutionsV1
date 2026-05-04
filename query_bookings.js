const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: jobs, error: jError } = await supabase
        .from('jobs')
        .select('*')
        .in('job_number', ['JOB-1077', 'JOB-1076']);
        
    if (jError) console.error(jError);
    else console.dir(jobs, { depth: null });
}
run();
