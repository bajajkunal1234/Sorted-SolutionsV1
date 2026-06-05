const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Checking for "Travel Expenses" account...');
    const { data: existing, error } = await supabase
        .from('accounts')
        .select('*')
        .ilike('name', 'Travel Expenses')
        .limit(1);
        
    if (error) {
        console.error(error);
        return;
    }
    
    if (existing && existing.length > 0) {
        console.log('"Travel Expenses" account already exists:', existing[0]);
    } else {
        console.log('"Travel Expenses" account not found. Creating it...');
        const { data: newAcc, error: createError } = await supabase
            .from('accounts')
            .insert([{
                name: 'Travel Expenses',
                under: 'indirect-expenses',
                type: 'expense',
                active: true,
                opening_balance: 0,
                closing_balance: 0,
                balance_type: 'dr',
                as_on_date: '2026-04-01',
                currency: 'INR'
            }])
            .select()
            .single();
            
        if (createError) {
            console.error('Failed to create account:', createError);
        } else {
            console.log('Successfully created "Travel Expenses" account:', newAcc);
        }
    }
}
run();
