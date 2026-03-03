const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
envRaw.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: apps } = await supabase.from('appliances').select('*');
    console.log("=== APPLIANCES ===");
    (apps || []).forEach(a => console.log(`${a.id}: ${a.name} (slug: ${a.slug})`));

    const { data: subs } = await supabase.from('appliance_subcategories').select('*');
    console.log("=== SUBCATEGORIES ===");
    (subs || []).forEach(s => console.log(`${s.id}: ${s.name} (slug: ${s.slug})`));

    const { data: pages } = await supabase.from('page_settings').select('page_id').like('page_id', '%oven%');
    console.log("=== OVEN PAGES in page_settings ===");
    (pages || []).forEach(p => console.log(p.page_id));
}
check();
