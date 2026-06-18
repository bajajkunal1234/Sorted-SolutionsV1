const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const calculateMetricsForMonth = (techId, ledgerId, mStart, mEnd, jobsList, invoicesList, interactionsList) => {
    // 1. Filter jobs for this technician in this month
    const techJobs = jobsList.filter(j =>
        (j.technician_id === techId) &&
        j.scheduled_date >= mStart && j.scheduled_date <= mEnd
    );
    const totalJobs = techJobs.length;

    // 2. Filter invoices for this technician in this month
    const techInvoices = invoicesList.filter(inv =>
        (inv.technician_id === techId) &&
        inv.date >= mStart && inv.date <= mEnd
    );

    console.log(`[calc] Tech ${techId}: filtered ${techJobs.length} jobs out of ${jobsList.length}, ${techInvoices.length} invoices out of ${invoicesList.length}`);
    if (techJobs.length > 0) {
        console.log(`[calc] Sample job tech_id: ${techJobs[0].technician_id} (type: ${typeof techJobs[0].technician_id}), techId: ${techId} (type: ${typeof techId})`);
    }

    return { totalJobs, techJobs, techInvoices };
};

async function run() {
    const activeMonth = '2026-06';
    const yr = 2026;
    const mo = 6;
    const monthStart = `${activeMonth}-01`;
    
    // Mimic local timezone toISOString split T split
    // Let's assume GMT+5:30 (India)
    const localDate = new Date(yr, mo, 0); // June 30th 00:00:00 local time
    const monthEnd = localDate.toISOString().split('T')[0];
    console.log(`monthStart: ${monthStart}, monthEnd: ${monthEnd}`);

    const historyStartObj = new Date(yr, mo - 4, 1);
    const historyStart = `${historyStartObj.getFullYear()}-${String(historyStartObj.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, job_number, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name, appliance, brand')
        .gte('scheduled_date', historyStart)
        .lte('scheduled_date', monthEnd);

    const { data: allInvoices } = await supabase
        .from('sales_invoices')
        .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id, items')
        .gte('date', historyStart)
        .lte('date', monthEnd)
        .neq('status', 'cancelled');

    const { data: techs } = await supabase.from('technicians').select('id, name, ledger_id');

    console.log(`Fetched techs: ${techs.length}`);
    console.log(`Fetched jobs: ${allJobs ? allJobs.length : 0}`);
    console.log(`Fetched invoices: ${allInvoices ? allInvoices.length : 0}`);

    techs.forEach(t => {
        console.log(`\nEvaluating tech: ${t.name} (id: ${t.id})`);
        calculateMetricsForMonth(t.id, t.ledger_id, monthStart, monthEnd, allJobs || [], allInvoices || [], []);
    });
}

run();
