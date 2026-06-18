const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const isServiceChargeOnlyInvoice = (inv) => {
    const items = inv.items || [];
    if (items.length === 0) return true;
    return items.every(item => {
        const desc = (item.description || item.name || '').toLowerCase();
        return desc.includes('service charge') || desc.includes('visiting charge') || desc.includes('visiting fee') || desc.includes('diagnostic charge');
    });
};

const calculateMetricsForMonth = (techId, ledgerId, mStart, mEnd, jobsList, invoicesList, interactionsList) => {
    const techJobs = jobsList.filter(j =>
        (j.technician_id === techId) &&
        j.scheduled_date >= mStart && j.scheduled_date <= mEnd
    );
    const totalJobs = techJobs.length;

    const techInvoices = invoicesList.filter(inv =>
        (inv.technician_id === techId) &&
        inv.date >= mStart && inv.date <= mEnd
    );

    const repairInvoices = techInvoices.filter(inv => !isServiceChargeOnlyInvoice(inv));
    const totalRevenue = repairInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const visitedJobs = techJobs.filter(j =>
        j.arrived_at ||
        ['diagnosing_quoting', 'work_in_progress', 'quotation_sent', 'parts_ordered', 'closed'].includes(j.status)
    );
    const visitsCount = visitedJobs.length;

    const closedJobs = techJobs.filter(j => j.status === 'closed');
    const closedCount = closedJobs.length;

    return {
        visitsCount,
        closedCount,
        totalRevenue,
        totalJobs,
        invoicesCount: techInvoices.length,
        repairInvoicesCount: repairInvoices.length
    };
};

async function run() {
    const activeMonth = '2026-06';
    const monthStart = '2026-06-01';
    const monthEnd = '2026-06-30';

    const { data: allJobs } = await supabase.from('jobs').select('*');
    const { data: allInvoices } = await supabase.from('sales_invoices').select('*').neq('status', 'cancelled');
    const { data: techs } = await supabase.from('technicians').select('id, name, ledger_id');

    console.log(`Total jobs fetched: ${allJobs.length}`);
    console.log(`Total invoices fetched: ${allInvoices.length}`);

    techs.forEach(t => {
        const metrics = calculateMetricsForMonth(t.id, t.ledger_id, monthStart, monthEnd, allJobs, allInvoices, []);
        console.log(`\nTechnician: ${t.name} (ID: ${t.id})`);
        console.log(`- Jobs in month: ${metrics.totalJobs}`);
        console.log(`- Visits count: ${metrics.visitsCount}`);
        console.log(`- Closed count: ${metrics.closedCount}`);
        console.log(`- Total revenue: ₹${metrics.totalRevenue}`);
        console.log(`- Invoices count: ${metrics.invoicesCount}`);
        console.log(`- Repair invoices: ${metrics.repairInvoicesCount}`);
    });
}

run();
