
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjA2NjYsImV4cCI6MjA4NjQ5NjY2Nn0.GG_BoDTXCWUR5MF9Pa3sP6ex9Dmw4fAbYOzBb9Eq1ZU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectJobs() {
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Job Schema Keys:', Object.keys(data[0]));
        console.log('Sample Data:', data[0]);
    } else {
        console.log('No jobs found to inspect.');
    }
}

inspectJobs();
