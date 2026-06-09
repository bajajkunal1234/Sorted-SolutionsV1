const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('sales_invoices').select('*').limit(5);
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Record count:', data.length);
    if (data.length > 0) {
        console.log('Keys:', Object.keys(data[0]));
        console.log('Sample Records:', data.map(d => ({
            id: d.id,
            invoice_number: d.invoice_number,
            reference: d.reference,
            technician_name: d.technician_name,
            technician_id: d.technician_id,
            created_by: d.created_by,
            job_id: d.job_id
        })));
    } else {
        console.log('No records found.');
    }
}

run();
