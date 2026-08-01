require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQueries() {
    console.log('Testing parallel queries...');

    try {
        const [
            expenses,
            purchaseInvoices,
            receipts,
            payments,
            inventory
        ] = await Promise.all([
            supabase.from('expenses').select('id, category, amount, status, date'),
            supabase.from('purchase_invoices').select('id, total_amount, status, date'),
            supabase.from('receipt_vouchers').select('id, amount, status, date'),
            supabase.from('payment_vouchers').select('id, amount, status, date'),
            supabase.from('inventory').select('id, name, category, current_stock, quantity, cost_price, selling_price, sale_price, purchase_price, min_stock_level, status')
        ]);

        console.log('Expenses query errors:', expenses.error);
        console.log('Expenses count:', expenses.data?.length);

        console.log('Purchase invoices query errors:', purchaseInvoices.error);
        console.log('Purchase invoices count:', purchaseInvoices.data?.length);

        console.log('Receipt vouchers query errors:', receipts.error);
        console.log('Receipt vouchers count:', receipts.data?.length);

        console.log('Payment vouchers query errors:', payments.error);
        console.log('Payment vouchers count:', payments.data?.length);

        console.log('Inventory query errors:', inventory.error);
        console.log('Inventory count:', inventory.data?.length);
        if (inventory.data && inventory.data.length > 0) {
            console.log('Sample inventory row:', inventory.data[0]);
        }
    } catch (e) {
        console.error('Exception during parallel query test:', e);
    }
}

testQueries();
