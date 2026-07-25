const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('1. Fetching Vinod Gupta Tech database record...');
    const { data: tech } = await supabase
        .from('technicians')
        .select('id, name, mdm_device_id')
        .eq('name', 'Vinod Gupta Tech')
        .single();

    console.log('Tech:', tech);

    console.log('\n2. Fetching live locations row...');
    const { data: loc } = await supabase
        .from('technician_live_locations')
        .select('*')
        .eq('technician_id', tech.id)
        .single();

    console.log('Live Location:', loc);

    console.log('\n3. Fetching today\'s attendance...');
    const today = new Date().toISOString().split('T')[0];
    const { data: att } = await supabase
        .from('technician_attendance')
        .select('*')
        .eq('technician_id', tech.id)
        .eq('date', today)
        .maybeSingle();

    console.log('Attendance:', att);

    console.log('\n4. Fetching current profiles list from ManageEngine...');
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';

    let token = null;
    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
            }),
        });
        const data = await response.json();
        token = data.access_token;
    } catch (err) {
        console.error('OAuth token failed:', err);
        return;
    }

    if (!token) return;

    try {
        const res = await fetch(`${apiHost}/api/v1/mdm/devices/${tech.mdm_device_id}/profiles`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profiles = await res.json();
        console.log('ManageEngine Profiles:', JSON.stringify(profiles, null, 2));
    } catch (e) {
        console.error('Error fetching ME profiles:', e);
    }
}

run();
