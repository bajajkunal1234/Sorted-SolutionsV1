require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
// Create client using ANON key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { trackLeadAttribution } = require('../lib/lead-tracker');

async function testAnonTrack() {
    console.log('Testing trackLeadAttribution with ANON client...');

    const res = await trackLeadAttribution(supabase, {
        phone: '9999988888',
        conversion_type: 'manual_account',
        name: 'Anon Test Customer',
        status: 'converted',
        notes: 'Testing anon tracking permissions',
        lead_source: 'google_ads',
        first_contact_at: new Date().toISOString()
    });

    console.log('Result:', res);
}

testAnonTrack();
