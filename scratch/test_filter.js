const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const activeMonth = '2026-06';
    const [yr, mo] = activeMonth.split('-').map(Number);
    const monthStart = `${activeMonth}-01`;
    const monthEnd = new Date(yr, mo, 0).toISOString().split('T')[0];

    const historyStartObj = new Date(yr, mo - 4, 1);
    const historyStart = `${historyStartObj.getFullYear()}-${String(historyStartObj.getMonth() + 1).padStart(2, '0')}-01`;

    console.log('Queries range:', historyStart, 'to', monthEnd);

    // 1. Fetch technicians
    const { data: techs, error: techsError } = await supabase
        .from('technicians')
        .select('*');
    if (techsError) console.error('techsError:', techsError);
    else console.log(`Fetched ${techs.length} technicians.`);

    // 2. Fetch jobs
    const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_number, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name, appliance, brand')
        .gte('scheduled_date', historyStart)
        .lte('scheduled_date', monthEnd);
    if (jobsError) console.error('jobsError:', jobsError);
    else console.log(`Fetched ${jobs.length} jobs.`);

    // 3. Fetch invoices
    const { data: invoices, error: invoicesError } = await supabase
        .from('sales_invoices')
        .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id, items')
        .gte('date', historyStart)
        .lte('date', monthEnd)
        .neq('status', 'cancelled');
    if (invoicesError) console.error('invoicesError:', invoicesError);
    else console.log(`Fetched ${invoices.length} invoices.`);

    // 4. Fetch interactions
    const { data: interactions, error: interactionsError } = await supabase
        .from('interactions')
        .select('job_id, type, metadata, timestamp')
        .gte('timestamp', historyStart)
        .in('type', ['job-closed', 'close-call-no-service']);
    if (interactionsError) console.error('interactionsError:', interactionsError);
    else console.log(`Fetched ${interactions.length} interactions.`);
}

run();
