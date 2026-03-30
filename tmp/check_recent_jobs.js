require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJobOrigins() {
    const jobNums = ['JOB-1029', 'JOB-1028', 'JOB-1017'];
    console.log(`Fetching jobs:`, jobNums);
    
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, job_number, status')
        .in('job_number', jobNums);

    if (error) {
        console.error("Error:", error);
        return;
    }

    for (const j of jobs) {
        console.log(`\n--- Job ${j.job_number} (${j.id}) ---`);
        
        // Check job_interactions
        const { data: ji } = await supabase.from('job_interactions').select('message, user_name, created_at').eq('job_id', j.id);
        if (ji && ji.length > 0) {
            console.log("Job Interactions:");
            ji.forEach(x => console.log(`  [${x.created_at}] ${x.user_name}: ${x.message}`));
        } else {
            console.log("No job_interactions found.");
        }
        
        // Check interactions
        const { data: i } = await supabase.from('interactions').select('description, created_by, created_at').eq('job_id', j.id);
        if (i && i.length > 0) {
            console.log("Interactions:");
            i.forEach(x => console.log(`  [${x.created_at}] ${x.created_by}: ${x.description}`));
        } else {
            console.log("No classic interactions found.");
        }
    }
}
checkJobOrigins();
