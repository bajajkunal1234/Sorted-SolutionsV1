const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Fetch job with string or number
    console.log('Querying jobs...');
    const { data: jobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id, job_number, status, scheduled_date')
        .or('job_number.eq.1247,job_number.eq.JOB-1247,job_number.ilike.%1247%');

    if (jobsErr) {
        console.error('Job query error:', jobsErr);
        return;
    }

    console.log(`Matched ${jobs ? jobs.length : 0} jobs:`);
    console.log(jobs);

    if (jobs && jobs.length > 0) {
        const jobId = jobs[0].id;
        // Fetch interactions for this job
        const { data: interactions, error: intErr } = await supabase
            .from('interactions')
            .select('*')
            .eq('job_id', jobId);
        
        console.log(`\n=== INTERACTIONS FOR JOB ID: ${jobId} ===`);
        if (intErr) {
            console.error('Int Error:', intErr);
        } else {
            console.log(`Found ${interactions.length} interactions:`);
            interactions.forEach(i => {
                console.log({
                    id: i.id,
                    type: i.type,
                    category: i.category,
                    description: i.description,
                    timestamp: i.timestamp,
                    created_at: i.created_at,
                    performed_by_name: i.performed_by_name,
                    source: i.source,
                    metadata: i.metadata
                });
            });
        }
    }
}

run();
