const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    let dropdownQuery = supabase
        .from('accounts')
        .select('id, name, mobile, phone, type, under, gst_applicable, tax_rate')
        .neq('status', 'archived')
        .order('name', { ascending: true })
        .limit(1000);
        
    // type === 'vendor'
    dropdownQuery = dropdownQuery.or('type.eq.supplier,type.eq.vendor,under.ilike.%supplier%,under.ilike.%vendor%,under.ilike.%creditor%');
    
    const { data: dropData, error: dropErr } = await dropdownQuery;
    if (dropErr) {
        console.error(dropErr);
        return;
    }
    console.log('Returned accounts count:', dropData.length);
    console.log('Matches with "royal":', dropData.filter(d => d.name.toLowerCase().includes('royal')));
    console.log('All accounts:', dropData.map(d => ({ name: d.name, type: d.type, under: d.under })));
}

run();
