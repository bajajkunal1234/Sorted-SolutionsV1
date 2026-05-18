const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_COLUMNS = [
    'id', 'name', 'type', 'under', 'gstin', 'address', 'opening_balance', 'closing_balance',
    'active', 'created_at', 'updated_at', 'sku', 'alias', 'contact_person', 'mobile',
    'email', 'mailing_name', 'mailing_address', 'billing_address', 'shipping_address',
    'pan', 'state_name', 'country', 'credit_limit', 'credit_period', 'bank_name',
    'account_number', 'ifsc_code', 'branch', 'tax_rate', 'acquisition_source',
    'referred_by', 'properties', 'as_on_date', 'balance_type', 'asset_category',
    'purchase_date', 'purchase_value', 'depreciation_method', 'depreciation_rate',
    'useful_life', 'status', 'micr_code', 'account_type', 'enable_cheque_printing',
    'rounding_method', 'currency'
];

async function run() {
    const id = 'ae1bfc8c-3317-4418-b852-f75817c211f5';
    console.log('Testing PUT logic on Deepak Desai...');

    const body = {
        id,
        name: 'Deepak Desai',
        type: 'customer',
        under: 'sundry-debtors',
        under_name: 'Current Assets > Sundry Debtors > Customers',
        mobile: '+91-98211 58749',
        email: 'email@example.com',
        contact_person: 'Deepak Desai (Juhu Imported Oven cx)',
        properties: [{ address: 'Juhu', locality: 'Juhu', pincode: '400049' }]
    };

    const { id: reqId, ...updates } = body;

    const cleanUpdates = {};
    for (const key of ALLOWED_COLUMNS) {
        if (updates[key] !== undefined) {
            cleanUpdates[key] = updates[key];
        }
    }

    console.log('Clean updates:', cleanUpdates);

    // Update accounts table
    const { data: accData, error: accErr } = await supabase.from('accounts').update(cleanUpdates).eq('id', id).select().single();
    if (accErr) {
        console.error('Account update failed:', accErr);
        return;
    }
    console.log('Account table update succeeded. New name:', accData.name);

    // Now test the sync logic
    const isCustomer = (updates.type === 'customer' || accData.type === 'customer') ||
        ((updates.under_name || accData.under_name || '').toLowerCase().includes('customer')) ||
        ((updates.under_name || accData.under_name || '').toLowerCase().includes('debtor'));

    console.log('isCustomer check:', isCustomer);

    if (isCustomer) {
        console.log('Running customer upsert...');
        const { data: custData, error: custErr } = await supabase.from('customers').upsert({
            name: updates.name || accData.name,
            phone: updates.mobile || accData.mobile,
            email: updates.email || accData.email,
            gstin: updates.gstin || accData.gstin,
            address: updates.mailing_address || accData.mailing_address,
            properties: updates.properties || accData.properties,
            ledger_id: id
        }, { onConflict: 'ledger_id' }).select();

        if (custErr) {
            console.error('Customer upsert failed precisely with error:', custErr);
        } else {
            console.log('Customer upsert succeeded:', custData);
        }
    }
}
run();
