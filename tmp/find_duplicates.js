require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findDuplicates() {
    console.log("Fetching all accounts with a mobile number...");
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, mobile, created_at, type, under')
        .not('mobile', 'is', null)
        .neq('mobile', '');

    if (error) {
        console.error("Error fetching accounts:", error);
        return;
    }

    // Group by mobile
    const grouped = {};
    accounts.forEach(acc => {
        if (!grouped[acc.mobile]) grouped[acc.mobile] = [];
        grouped[acc.mobile].push(acc);
    });

    const duplicates = [];
    for (const [mobile, accs] of Object.entries(grouped)) {
        if (accs.length > 1) {
            // Sort by created_at (oldest first)
            accs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            duplicates.push({ mobile, accounts: accs });
        }
    }

    if (duplicates.length === 0) {
        console.log("No duplicate mobile numbers found in accounts!");
    } else {
        console.log(`Found ${duplicates.length} duplicate mobile numbers:`);
        
        for (const dist of duplicates) {
            console.log(`\nPhone: ${dist.mobile}`);
            for (let i = 0; i < dist.accounts.length; i++) {
                const acc = dist.accounts[i];
                console.log(`  [${i+1}] ${acc.created_at} - ${acc.name} - ID: ${acc.id} (Under: ${acc.under}, Type: ${acc.type})`);
            }
        }
    }
}

findDuplicates();
