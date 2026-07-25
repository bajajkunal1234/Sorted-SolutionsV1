const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testResolution() {
    const technicianId = '0afe33e9-74e5-4cb4-82b7-dfce153a6540';
    console.log("Fetching transactions for technician:", technicianId);

    const { data: txs, error: txError } = await supabase
        .from('technician_stock_transactions')
        .select('*')
        .eq('technician_id', technicianId);

    if (txError) {
        console.error("txError:", txError);
        return;
    }

    const invoiceIds = txs
        .filter(t => t.transaction_type === 'sale' && t.reference_id)
        .map(t => t.reference_id);

    console.log("Found sale transaction invoice IDs:", invoiceIds);

    if (invoiceIds.length > 0) {
        console.log("Querying sales_invoices and jobs for IDs...");
        const { data: invoices, error: invError } = await supabase
            .from('sales_invoices')
            .select(`
                id,
                invoice_number,
                job_id,
                jobs (
                    id,
                    job_number,
                    property
                )
            `)
            .in('id', invoiceIds);

        if (invError) {
            console.error("invError:", invError);
        } else {
            console.log("Invoices and jobs result:", JSON.stringify(invoices, null, 2));
            
            const invoiceMap = {};
            invoices.forEach(inv => {
                const prop = inv.jobs?.property || {};
                invoiceMap[inv.id] = {
                    job_id: inv.job_id,
                    job_number: inv.jobs?.job_number || 'N/A',
                    location: [prop.locality, prop.city].filter(Boolean).join(', ') || 'Unknown Location'
                };
            });
            console.log("Mapped invoice locations:", invoiceMap);
        }
    }
}

testResolution();
