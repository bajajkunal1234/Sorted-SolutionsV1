const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilter() {
    const technicianId = '3c593991-902e-42a6-b0f3-5b74ea22691d';
    const date = '2026-07-13';

    const startIST = new Date(`${date}T00:00:00+05:30`);
    const fortyEightHoursAgo = new Date(startIST.getTime() - 48 * 60 * 60 * 1000);

    const { data: allJobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('technician_id', technicianId);

    if (jobsError) {
        console.error(jobsError);
        return;
    }

    console.log("Total jobs assigned to technician:", allJobsData.length);

    const rawJobs = (allJobsData || []).filter(j => {
        const isToday = j.scheduled_date === date || new Date(j.updated_at) >= startIST;
        const isActive = j.status !== 'closed' && j.status !== 'cancelled';
        const isRecentClosedCancelled = (j.status === 'closed' || j.status === 'cancelled') && new Date(j.updated_at) >= fortyEightHoursAgo;
        return isToday || isActive || isRecentClosedCancelled;
    });

    console.log("Filtered jobs for July 13 timeline:");
    rawJobs.forEach(j => {
        console.log(`Job Number: ${j.job_number}, Status: ${j.status}, Updated At: ${j.updated_at}, Scheduled: ${j.scheduled_date}`);
    });
}
testFilter();
