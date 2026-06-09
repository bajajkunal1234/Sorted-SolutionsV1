const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
            id,
            invoice_number,
            jobs(job_number, technician_name)
        `)
        .not('job_id', 'is', null)
        .limit(2);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

run();
