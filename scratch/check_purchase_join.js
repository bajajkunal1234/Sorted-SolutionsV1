const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
            id,
            invoice_number,
            po_reference,
            technicians:technicians!purchase_invoices_po_reference_fkey(name)
        `)
        .eq('reference', 'Technician Purchase')
        .limit(2);

    if (error) {
        console.error('Explicit fkey join error:', error);
        
        // Let's try implicit/default join
        const { data: data2, error: error2 } = await supabase
            .from('purchase_invoices')
            .select(`
                id,
                invoice_number,
                po_reference,
                technicians(name)
            `)
            .eq('reference', 'Technician Purchase')
            .limit(2);
        
        if (error2) {
            console.error('Implicit join error:', error2);
        } else {
            console.log('Implicit join succeeded:', data2);
        }
    } else {
        console.log('Explicit join succeeded:', data);
    }
}

run();
