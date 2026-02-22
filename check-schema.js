const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

async function checkSchema() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error('Env vars missing');
        return;
    }

    const supabase = createClient(url, key);

    // Check page_settings columns
    console.log('--- Checking page_settings structure ---');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'page_settings'"
    });

    if (error) {
        // If RPC fails, try a direct query (might fail if not allowed)
        console.error('RPC Failed:', error.message);
        console.log('Attempting direct query via select...');
        const { data: selectData, error: selectError } = await supabase.from('page_settings').select('*').limit(1);
        if (selectError) console.error('Select Error:', selectError.message);
        else console.log('Columns found in select:', Object.keys(selectData[0] || {}));
    } else {
        console.log('Columns:', data.map(c => `${c.column_name} (${c.data_type})`));
    }
}

checkSchema();
