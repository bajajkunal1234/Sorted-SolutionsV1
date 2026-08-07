require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSidDate() {
    console.log('Fixing Sid Chauhan date...');

    const { data, error } = await supabase
        .from('lead_attributions')
        .update({
            first_contact_at: '2026-08-05T12:45:14.331+00:00'
        })
        .eq('phone', '8169833751')
        .select();

    console.log('Update result:', data);
    console.log('Error:', error);
}

fixSidDate();
