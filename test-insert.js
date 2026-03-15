require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Fetching groups...');
    const { data: cGroup, error: grpErr } = await supabase
        .from('account_groups')
        .select('id, name')
        .ilike('name', 'Customers')
        .limit(1)
        .maybeSingle();
        
    console.log('Group mapping:', cGroup, grpErr);
    
    // Simulate what the API is doing
    const payload = {
        name: 'Test Customer',
        sku: 'C999',
        mobile: '9999999999',
        type: 'customer',
        under: cGroup ? cGroup.id : null, 
        opening_balance: 0,
        balance_type: 'debit',
        created_at: new Date().toISOString(),
    };
    
    console.log('Inserting payload:', payload);
    const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select('id');
        
    console.log('Result:', { data, error });
}

test();
