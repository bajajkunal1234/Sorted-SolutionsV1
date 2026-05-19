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
    const id = '242dc116-b1db-4122-ac01-9a8f7c351fd9';
    console.log('Testing updates on Juhu Customer...');

    // Fetch before state
    const { data: before } = await supabase.from('accounts').select('*').eq('id', id).single();

    const updates = {
        name: 'Juhu Customer Updated',
        mobile: '+91-99998 83145',
        type: 'customer',
        under: 'customers'
    };

    const cleanUpdates = {};
    for (const key of ALLOWED_COLUMNS) {
        if (updates[key] !== undefined) {
            cleanUpdates[key] = updates[key];
        }
    }

    const { data, error } = await supabase
        .from('accounts')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Account update error:', error);
        return;
    }
    console.log('Account update success:', data.name);

    // Sync with customers
    const isCustomer = (updates.type === 'customer' || data.type === 'customer') ||
        ((updates.under_name || data.under_name || '').toLowerCase().includes('customer')) ||
        ((updates.under_name || data.under_name || '').toLowerCase().includes('debtor'));

    console.log('isCustomer:', isCustomer);

    if (isCustomer) {
        console.log('Upserting customer details...');
        const { data: custData, error: custErr } = await supabase.from('customers').upsert({
            name: updates.name || data.name,
            phone: updates.mobile || data.mobile,
            email: updates.email || data.email,
            gstin: updates.gstin || data.gstin,
            address: updates.mailing_address || data.mailing_address,
            properties: updates.properties || data.properties,
            ledger_id: id
        }, { onConflict: 'ledger_id' }).select();

        if (custErr) {
            console.error('Customer upsert error:', custErr);
        } else {
            console.log('Customer upsert success:', custData);
        }
    }

    // Revert account name
    await supabase.from('accounts').update({ name: before.name }).eq('id', id);
    console.log('Reverted Juhu Customer name back to:', before.name);
}
run();
