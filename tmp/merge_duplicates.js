require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function mergeDuplicates() {
    const duplicates = [
        { 
            phone: '8922944635', 
            old_id: '4bf6567f-1b6e-4ebb-a6f8-b609d8aa805a', // Anurag
            new_id: '7ae3731f-1757-4676-ad74-b09f5ad3056f' 
        },
        { 
            phone: '9799120292', 
            old_id: '2c72fcbd-64f7-4386-8b6f-0fd040fadf2d', // Gaurav Tak
            new_id: 'e496ea0f-234c-466d-ab18-c50735345498' 
        }
    ];

    for (const d of duplicates) {
        console.log(`\nMerging for phone: ${d.phone}`);

        // 1. Point the customer row to the old ledger ID
        console.log(`  Updating customers table to point to old_id (${d.old_id})...`);
        const { error: err1 } = await supabase
            .from('customers')
            .update({ ledger_id: d.old_id })
            .eq('ledger_id', d.new_id);
        
        if (err1) {
            console.error("  Error updating customer:", err1.message);
            continue;
        }

        // 2. Refresh old account to have correct source & type (like claiming)
        console.log("  Updating old account metadata...");
        await supabase
            .from('accounts')
            .update({ source: 'Customer Signup', type: 'customer' })
            .eq('id', d.old_id);

        // 3. Delete the blank new account
        console.log(`  Deleting the redundant account (${d.new_id})...`);
        const { error: err3 } = await supabase
            .from('accounts')
            .delete()
            .eq('id', d.new_id);

        if (err3) {
            console.error("  Error deleting redundant account. Ensure no jobs/invoices are attached to it:", err3.message);
        } else {
            console.log("  Merge strict successfully completed.");
        }
    }
}

mergeDuplicates();
