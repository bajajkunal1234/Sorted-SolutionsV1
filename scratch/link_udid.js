const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Role Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching all technicians...');
    const { data: techs, error: fetchErr } = await supabase
        .from('technicians')
        .select('id, name, mdm_device_id');
        
    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }

    console.log('Current technicians list:', techs);

    // Target the first active/test technician (e.g. Hitesh Tayde Tech)
    const targetTech = techs.find(t => t.name.toLowerCase().includes('hitesh')) || techs[0];

    if (!targetTech) {
        console.error('No technicians found to link.');
        return;
    }

    console.log(`Linking UDID "4e6134444b055048" to technician "${targetTech.name}" (${targetTech.id})...`);
    
    const { data: updated, error: updateErr } = await supabase
        .from('technicians')
        .update({ mdm_device_id: '4e6134444b055048' })
        .eq('id', targetTech.id)
        .select('id, name, mdm_device_id')
        .single();

    if (updateErr) {
        console.error('Update error:', updateErr);
        return;
    }

    console.log('Successfully updated technician record:', updated);
}

run();
