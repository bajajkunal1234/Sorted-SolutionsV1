const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying accounts under Expenses/Indirect Expenses...');
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, under, type')
        .limit(200);
        
    if (error) {
        console.error(error);
        return;
    }
    
    const expenseAccounts = accounts.filter(a => 
        (a.under || '').toLowerCase().includes('expense') ||
        (a.under || '').toLowerCase().includes('indirect') ||
        (a.type || '').toLowerCase().includes('expense')
    );
    console.log('Expense Accounts found:', expenseAccounts);
}
run();
