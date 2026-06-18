const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: invoices, error } = await supabase
        .from('sales_invoices')
        .select('invoice_number, date, total_amount, technician_id, technician_name')
        .gte('date', '2026-06-01')
        .lte('date', '2026-06-30')
        .neq('status', 'cancelled')
        .order('date', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${invoices.length} invoices:`);
    invoices.forEach(inv => {
        console.log(`- ${inv.invoice_number} | Date: ${inv.date} | Amt: ₹${inv.total_amount} | Tech: ${inv.technician_name} (ID: ${inv.technician_id})`);
    });
}

run();
