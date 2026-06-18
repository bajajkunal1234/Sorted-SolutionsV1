const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const historyStart = '2026-03-01';
    const monthEnd = '2026-06-30';

    console.log('Fetching jobs with anon key...');
    const { data: jobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id, job_number, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name, appliance, brand')
        .gte('scheduled_date', historyStart)
        .lte('scheduled_date', monthEnd);

    if (jobsErr) {
        console.error('Jobs Query Error:', jobsErr);
    } else {
        console.log(`Jobs Query Success: fetched ${jobs ? jobs.length : 0} jobs.`);
    }

    console.log('Fetching invoices with anon key...');
    const { data: invoices, error: invErr } = await supabase
        .from('sales_invoices')
        .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id, items')
        .gte('date', historyStart)
        .lte('date', monthEnd)
        .neq('status', 'cancelled');

    if (invErr) {
        console.error('Invoices Query Error:', invErr);
    } else {
        console.log(`Invoices Query Success: fetched ${invoices ? invoices.length : 0} invoices.`);
    }

    console.log('Fetching interactions with anon key...');
    const { data: interactions, error: intErr } = await supabase
        .from('interactions')
        .select('job_id, type, metadata, timestamp')
        .gte('timestamp', historyStart)
        .in('type', ['job-closed', 'close-call-no-service']);

    if (intErr) {
        console.error('Interactions Query Error:', intErr);
    } else {
        console.log(`Interactions Query Success: fetched ${interactions ? interactions.length : 0} interactions.`);
    }
}

run();
