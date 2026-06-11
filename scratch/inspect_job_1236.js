const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying JOB-1236...');
    const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_number', 'JOB-1236')
        .maybeSingle();

    if (error) {
        console.error('Error fetching job:', error);
        return;
    }
    
    if (!job) {
        console.log('JOB-1236 not found!');
        return;
    }

    console.log('Job Record:', {
        id: job.id,
        job_number: job.job_number,
        customer_name: job.customer_name,
        status: job.status,
        amount: job.amount,
        description: job.description,
        notes: job.notes,
        created_at: job.created_at,
        completed_at: job.completed_at,
        repair_note_added_at: job.repair_note_added_at,
        warranty: job.warranty,
    });

    console.log('Querying interactions for Job ID:', job.id);
    const { data: interactions, error: intError } = await supabase
        .from('interactions')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: true });

    if (intError) {
        console.error('Error fetching interactions:', intError);
        return;
    }

    console.log('Interactions Timeline:');
    interactions.forEach(i => {
        console.log(`- [${i.created_at}] Type: ${i.type} | By: ${i.performed_by_name} | Desc: ${i.description}`);
    });
}

run();
