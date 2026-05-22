const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJobsSchema() {
    const { data, error } = await supabase.from('jobs').select('*').limit(1);
    if (error) {
        console.error('Error fetching jobs:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in jobs table:', Object.keys(data[0]));
        } else {
            console.log('No jobs found to check columns.');
        }
    }
}

checkJobsSchema();
