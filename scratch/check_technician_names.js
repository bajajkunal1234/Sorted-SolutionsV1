const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, technician_name, job_id, jobs(id, technician_name, assigned_technician:technicians(name))')
        .not('technician_name', 'is', null)
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Found non-null technician_name invoices:', data.length);
    console.log('Samples:', data);

    // Let's also check if there are invoices without technician_name but with a job that has a technician
    const { data: jobInvoices, error: jobErr } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, technician_name, job_id, jobs(id, assigned_to, technicians!jobs_assigned_to_fkey(name))')
        .not('job_id', 'is', null)
        .limit(10);
    
    if (jobErr) {
        console.error('Job invoices query error:', jobErr);
    } else {
        console.log('Sample job invoices with nested job technician:', jobInvoices.map(ji => ({
            id: ji.id,
            invoice_number: ji.invoice_number,
            technician_name: ji.technician_name,
            job_id: ji.job_id,
            job_tech: ji.jobs?.technicians?.name || 'none'
        })));
    }
}

run();
