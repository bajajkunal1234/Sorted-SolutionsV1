const { createClient } = require('@supabase/supabase-js');
// Let's read the environment variables or supabase config
// Wait, we can just load supabase client from '@/lib/supabase' or read it.
// Actually, next.js env vars are in .env.local.
const fs = require('fs');
const dotenv = require('dotenv');
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data: groups, error: error1 } = await supabase
        .from('account_groups')
        .select('*');
    console.log('--- Account Groups ---');
    console.log(groups?.map(g => ({ id: g.id, name: g.name, parent: g.parent })));

    const { data: accounts, error: error2 } = await supabase
        .from('accounts')
        .select('id, name, under, type')
        .limit(20);
    console.log('--- Accounts Sample ---');
    console.log(accounts);
}

run();
