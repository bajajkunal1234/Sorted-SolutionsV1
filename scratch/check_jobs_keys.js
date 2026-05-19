const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying first job...');
    const { data: jobs, error } = await supabase.from('jobs').select('*').limit(1);
    if (error) {
        console.error('ERROR:', error);
        return;
    }
    if (jobs && jobs[0]) {
        console.log('All keys in jobs table:', Object.keys(jobs[0]));
        console.log('Sample job keys & values:');
        for (const k of Object.keys(jobs[0])) {
            if (jobs[0][k] !== null && typeof jobs[0][k] !== 'object') {
                console.log(`  ${k}: ${jobs[0][k]}`);
            }
        }
    } else {
        console.log('No jobs found!');
    }
}
run();
