require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { trackLeadAttribution } = require('../lib/lead-tracker');

async function testTrack() {
    console.log('Testing trackLeadAttribution for Sid Chauhan...');

    const res = await trackLeadAttribution(supabase, {
        phone: '8169833751',
        conversion_type: 'manual_account',
        name: 'Sid Chauhan Powai',
        status: 'converted',
        notes: 'Testing manual tracking',
        lead_source: 'google_ads',
        first_contact_at: new Date().toISOString()
    });

    console.log('Result:', res);
}

testTrack();
