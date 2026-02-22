import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    console.log('Connecting to:', url);
    const testId = 'cat-washing-machine-repair';

    // 1. Check page_settings
    const { data: ps, error: psErr } = await supabase
        .from('page_settings')
        .select('*')
        .eq('page_id', testId);

    console.log('--- PAGE SETTINGS ---');
    console.log('Count:', ps?.length);
    console.log('Data:', JSON.stringify(ps, null, 2));
    if (psErr) console.error('Error:', psErr);

    // 2. Check problems
    const { data: prob, error: probErr } = await supabase
        .from('page_problems')
        .select('*')
        .eq('page_id', testId);

    console.log('--- PROBLEMS ---');
    console.log('Count:', prob?.length);
    if (probErr) console.error('Error:', probErr);

    // 3. Check services
    const { data: serv, error: servErr } = await supabase
        .from('page_services')
        .select('*')
        .eq('page_id', testId);

    console.log('--- SERVICES ---');
    console.log('Count:', serv?.length);
    if (servErr) console.error('Error:', servErr);
}

run();
