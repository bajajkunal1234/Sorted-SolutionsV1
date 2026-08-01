const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJobs() {
    const { data: jobs, error } = await supabase.from('jobs').select('status, created_at');
    if (error) {
        console.error(error);
        return;
    }
    const counts = {};
    jobs.forEach(j => {
        counts[j.status] = (counts[j.status] || 0) + 1;
    });
    console.log("Job status counts in DB:", counts);
}
checkJobs();
