const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying jobs for June 2026...');
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .gte('scheduled_date', '2026-06-01')
        .lte('scheduled_date', '2026-06-30');

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }
    
    console.log(`Found ${jobs.length} jobs in June 2026.`);
    if (jobs.length > 0) {
        console.log('First 5 jobs details:');
        jobs.slice(0, 5).forEach(j => {
            console.log(`- ID: ${j.id} | JobNo: ${j.job_number} | TechId: ${j.technician_id} | TechName: ${j.technician_name} | Date: ${j.scheduled_date} | Status: ${j.status} | ArrivedAt: ${j.arrived_at}`);
        });
    }

    console.log('\nQuerying all technicians to see IDs and names...');
    const { data: techs, error: techError } = await supabase
        .from('technicians')
        .select('id, name');

    if (techError) {
        console.error('Error fetching techs:', techError);
        return;
    }
    techs.forEach(t => {
        console.log(`- Tech ID: ${t.id} | Name: ${t.name}`);
    });
}

run();
