const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvoiceAttribution() {
    console.log('Testing Invoice & Quotation Attribution...');

    // 1. Fetch a technician
    const { data: techs, error: techErr } = await supabase.from('technicians').select('id, name').limit(1);
    if (techErr || !techs || techs.length === 0) {
        console.error('No technicians found in DB:', techErr);
        process.exit(1);
    }
    const tech = techs[0];
    console.log(`Using technician: ${tech.name} (${tech.id})`);

    // 2. Fetch a customer account
    const { data: accounts, error: accErr } = await supabase.from('accounts').select('id, name').eq('under', 'Sundry Debtors').limit(1);
    const customer = accounts?.[0] || { id: null, name: 'Test Customer' };
    console.log(`Using customer account: ${customer.name} (${customer.id})`);

    // 3. Test insert into sales_invoices
    const testInvoice = {
        invoice_number: `TEST-INV-${Date.now().toString().slice(-4)}`,
        account_id: customer.id,
        account_name: customer.name,
        date: new Date().toISOString().split('T')[0],
        total_amount: 1000,
        status: 'draft',
        items: [],
        technician_id: tech.id,
        technician_name: tech.name
    };

    console.log('Inserting test invoice into sales_invoices...');
    const { data: invoiceResult, error: invInsertErr } = await supabase
        .from('sales_invoices')
        .insert([testInvoice])
        .select()
        .single();

    if (invInsertErr) {
        console.error('Failed to insert sales invoice with technician info:', invInsertErr);
        process.exit(1);
    }
    console.log('Successfully inserted sales invoice:', invoiceResult.invoice_number);
    console.log(`Assigned Tech in DB: ${invoiceResult.technician_name} (${invoiceResult.technician_id})`);

    // 4. Test insert into quotations
    const testQuotation = {
        quote_number: `TEST-QT-${Date.now().toString().slice(-4)}`,
        account_id: customer.id,
        account_name: customer.name,
        date: new Date().toISOString().split('T')[0],
        total_amount: 1000,
        status: 'draft',
        items: [],
        technician_id: tech.id,
        technician_name: tech.name
    };

    console.log('Inserting test quotation into quotations...');
    const { data: quoteResult, error: qtInsertErr } = await supabase
        .from('quotations')
        .insert([testQuotation])
        .select()
        .single();

    if (qtInsertErr) {
        console.error('Failed to insert quotation with technician info:', qtInsertErr);
        // Clean up invoice
        await supabase.from('sales_invoices').delete().eq('id', invoiceResult.id);
        process.exit(1);
    }
    console.log('Successfully inserted quotation:', quoteResult.quote_number);
    console.log(`Assigned Tech in DB: ${quoteResult.technician_name} (${quoteResult.technician_id})`);

    // 5. Clean up
    console.log('Cleaning up test records...');
    await supabase.from('sales_invoices').delete().eq('id', invoiceResult.id);
    await supabase.from('quotations').delete().eq('id', quoteResult.id);
    console.log('Verification completed successfully! Columns are fully active and writable.');
}

testInvoiceAttribution();
