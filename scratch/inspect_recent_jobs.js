const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectJobDetails() {
    const jobIds = [
        '24406cf6-0be7-43f0-8986-413a411c43e2', // JOB-1485
        'dd389b66-0586-4ed9-9320-ac1d1cc20a47'  // JOB-1484
    ];

    for (const jobId of jobIds) {
        console.log(`\n=================== INSPECTING JOB: ${jobId} ===================`);
        
        // 1. Fetch Job row
        const { data: job } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        console.log('Job:', {
            job_number: job?.job_number,
            status: job?.status,
            technician_name: job?.technician_name,
            total_amount: job?.total_amount
        });

        // 2. Fetch Quotations
        const { data: quotes } = await supabase
            .from('quotations')
            .select('*')
            .eq('job_id', jobId);
        
        console.log(`Quotations found: ${quotes?.length || 0}`);
        quotes?.forEach(q => {
            console.log(`- Quote ID: ${q.id}, Quote#: ${q.quote_number}, Status: ${q.status}, Type: ${q.type || 'N/A'}`);
            console.log('  Items:', JSON.stringify(q.items, null, 2));
        });

        // 3. Fetch Sales Invoices
        const { data: invoices } = await supabase
            .from('sales_invoices')
            .select('*')
            .eq('job_id', jobId);
        
        console.log(`Sales Invoices found: ${invoices?.length || 0}`);
        invoices?.forEach(t => {
            console.log(`- Invoice ID: ${t.id}, Inv#: ${t.invoice_number}, Status: ${t.status}, Technician: ${t.technician_name} (${t.technician_id})`);
            console.log('  Items:', JSON.stringify(t.items, null, 2));
        });

        // 4. Fetch Stock Transactions
        const { data: stockTx } = await supabase
            .from('technician_stock_transactions')
            .select('*, inventory(name)')
            .eq('reference_id', invoices?.[0]?.id || 'null');
        console.log(`Stock Transactions found: ${stockTx?.length || 0}`);
        stockTx?.forEach(st => {
            console.log(`- Item: ${st.inventory?.name}, Qty Change: ${st.quantity}, Notes: ${st.notes}`);
        });
    }

    // Print stock list for Kunal
    console.log('\n--- Kunal Bajaj Current Stock ---');
    const { data: stock } = await supabase
        .from('technician_stock')
        .select('*, inventory(name)')
        .eq('technician_id', '0afe33e9-74e5-4cb4-82b7-dfce153a6540');
    stock?.forEach(s => {
        console.log(`- ${s.inventory?.name}: ${s.quantity}`);
    });
}

inspectJobDetails();
