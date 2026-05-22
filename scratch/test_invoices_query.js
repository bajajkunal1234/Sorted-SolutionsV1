const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInvoicesQuery() {
    const { data: accounts, error: accError } = await supabase.from('accounts').select('id, name').limit(10);
    if (accError) {
        console.error('Error fetching accounts:', accError);
        return;
    }
    
    console.log('Sample Accounts:');
    accounts.forEach(a => console.log(`- ID: ${a.id}, Name: ${a.name}`));

    const { data: invoices, error: invError } = await supabase.from('sales_invoices').select('*').limit(5);
    if (invError) {
        console.error('Error fetching sales invoices:', invError);
        return;
    }

    console.log('\nSample Sales Invoices:');
    invoices.forEach(i => console.log(`- ID: ${i.id}, Number: ${i.invoice_number}, Account ID: ${i.account_id}, Total: ${i.total_amount}, Date: ${i.date}`));
}

testInvoicesQuery();
