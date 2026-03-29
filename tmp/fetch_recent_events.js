require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 5);
    const dateStr = daysAgo.toISOString();

    const { data: accounts, error: err1 } = await supabase
        .from('accounts')
        .select('id, name, type, under, created_at')
        .gte('created_at', dateStr)
        .order('created_at', { ascending: false });
    
    if (err1) console.error("Error accounts:", err1);

    const { data: customers, error: err2 } = await supabase
        .from('customers')
        .select('id, phone, name, full_name, created_at')
        .gte('created_at', dateStr)
        .order('created_at', { ascending: false });

    if (err2) console.error("Error customers:", err2.message);

    console.log("\n=== RECENT CUSTOMER ROWS (Since 5 Days Ago) ===");
    (customers || []).forEach(c => console.log(`[${c.created_at}] ${c.name || c.full_name} (${c.phone})`));

    console.log("\n=== RAW ACCOUNTS TABLE ENTRIES (Since 5 Days Ago) ===");
    (accounts || []).forEach(a => console.log(`[${a.created_at}] ${a.name} | Type: ${a.type} | Under: ${a.under}`));
}

run();
