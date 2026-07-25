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
    console.log('Remapping UDID to Vinod Gupta Tech...');
    
    // 1. Clear Hitesh's mdm_device_id
    const { data: cleared, error: clearErr } = await supabase
        .from('technicians')
        .update({ mdm_device_id: null })
        .eq('name', 'Hitesh Tayde Tech')
        .select('id, name, mdm_device_id');

    if (clearErr) {
        console.error('Error clearing Hitesh:', clearErr);
        return;
    }
    console.log('Cleared Hitesh record:', cleared);

    // 2. Link UDID to Vinod Gupta Tech
    const { data: updated, error: updateErr } = await supabase
        .from('technicians')
        .update({ mdm_device_id: '4e6134444b055048' })
        .eq('name', 'Vinod Gupta Tech')
        .select('id, name, mdm_device_id')
        .single();

    if (updateErr) {
        console.error('Error updating Vinod:', updateErr);
        return;
    }
    console.log('Linked Vinod Gupta Tech record:', updated);
}

run();
