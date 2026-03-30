require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log("Starting migration of historical accounts...");
    
    // Find customers marked as 'asset' and under 'customer-accounts' or 'customers'
    const { data: accounts, error: err1 } = await supabase
        .from('accounts')
        .select('id, name, type, under')
        .eq('type', 'asset')
        .in('under', ['customer-accounts', 'customers']);

    if (err1) {
        console.error("Error fetching accounts:", err1);
        return;
    }

    console.log(`Found ${accounts.length} accounts to migrate.`);

    let successCount = 0;
    for (const acc of accounts) {
        console.log(`Migrating: ${acc.name} (${acc.id})`);
        const { error: err2 } = await supabase
            .from('accounts')
            .update({ type: 'customer', under: 'sundry-debtors' })
            .eq('id', acc.id);
            
        if (err2) {
            console.error(`Failed to migrate ${acc.name}:`, err2);
        } else {
            successCount++;
        }
    }

    console.log(`\nMigration complete. Successfully updated ${successCount}/${accounts.length} accounts.`);
}

migrate();
