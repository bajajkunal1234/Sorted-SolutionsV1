const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching database tables...');
    const { data, error } = await supabase.rpc('get_tables_list'); // Check if there is a helper
    
    if (error) {
        // Fallback: Query pg_catalog via direct sql if RPC doesn't exist
        // Since we can't run raw SQL directly without RPC, let's query a known table or list views
        console.log('RPC failed. Fetching list from public schema queries...');
    }
    
    // Let's run a query on pg_class or check tables we know
    const { data: schemas, error: schemaErr } = await supabase
        .from('technicians')
        .select('*')
        .limit(1);
    
    console.log('Supabase connection is active. Handshake test:', schemaErr ? 'FAILED' : 'SUCCESS');
    
    // Let's check if we can select from a potential 'settings' table
    const { data: settings, error: settingsErr } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
    
    console.log('settings table exists:', !settingsErr);
    if (!settingsErr) console.log('settings data:', settings);

    const { data: system_config, error: configErr } = await supabase
        .from('system_config')
        .select('*')
        .limit(1);
        
    console.log('system_config table exists:', !configErr);
}

run();
