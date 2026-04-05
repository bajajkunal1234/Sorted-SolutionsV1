require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate_phase2() {
    console.log("Starting phase 2 migration of active accounts...");
    
    // Find customers marked as 'customer' and under 'customers'
    const { data: accounts, error: err1 } = await supabase
        .from('accounts')
        .select('id, name, type, under')
        .eq('type', 'customer')
        .eq('under', 'customers');

    if (err1) {
        console.error("Error fetching accounts:", err1);
        return;
    }

    console.log(`Found ${accounts.length} accounts to align under Sundry Debtors.`);

    let successCount = 0;
    for (const acc of accounts) {
        console.log(`Aligning: ${acc.name} (${acc.id})`);
        const { error: err2 } = await supabase
            .from('accounts')
            .update({ under: 'sundry-debtors' })
            .eq('id', acc.id);
            
        if (err2) {
            console.error(`Failed to align ${acc.name}:`, err2);
        } else {
            successCount++;
        }
    }

    console.log(`\nPhase 2 Complete. Successfully aligned ${successCount}/${accounts.length} accounts to Sundry Debtors.`);
}

migrate_phase2();
