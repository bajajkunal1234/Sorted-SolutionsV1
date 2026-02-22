const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPage(pageId) {
    console.log(`\n--- Checking ${pageId} ---`);

    const { data: page } = await supabase.from('page_settings').select('*').eq('page_id', pageId).single();
    console.log('Main Settings:', page ? 'FOUND' : 'NOT FOUND');
    if (page) console.log('Visibility:', JSON.stringify(page.section_visibility));

    const { data: problems } = await supabase.from('page_problems').select('*').eq('page_id', pageId);
    console.log(`Problems: ${problems?.length || 0}`);

    const { data: services } = await supabase.from('page_services').select('*').eq('page_id', pageId);
    console.log(`Services: ${services?.length || 0}`);

    const { data: localities } = await supabase.from('page_localities').select('*').eq('page_id', pageId);
    console.log(`Localities: ${localities?.length || 0}`);
}

async function run() {
    await checkPage('sloc-goregaon-ac-repair');
    await checkPage('cat-water-purifier-repair');
}

run();
