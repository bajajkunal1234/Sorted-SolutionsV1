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
    console.log('1. Loading Vinod Gupta Tech database record...');
    const { data: tech, error: techErr } = await supabase
        .from('technicians')
        .select('id, name, mdm_device_id')
        .eq('name', 'Vinod Gupta Tech')
        .single();

    if (techErr || !tech) {
        console.error('Error fetching Vinod:', techErr);
        return;
    }

    console.log(`Vinod's saved mdm_device_id: "${tech.mdm_device_id}"`);

    if (!tech.mdm_device_id) {
        console.log('mdm_device_id is blank. Please save the 17-digit ID in the admin panel first.');
        return;
    }

    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';
    const profileId = '51167000000097017';

    console.log('2. Fetching Zoho access token...');
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
        console.log('Access token fetched:', token ? 'YES' : 'NO');
    } catch (err) {
        console.error('OAuth token failed:', err);
        return;
    }

    if (!token) return;

    console.log(`3. Invoking associateProfile for device "${tech.mdm_device_id}"...`);
    const url = `${apiHost}/api/v1/mdm/devices/${tech.mdm_device_id}/profiles`;
    console.log('URL:', url);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile_ids: [profileId],
            }),
        });

        console.log('HTTP Status Code:', response.status);
        const text = await response.text();
        console.log('Response Content:', text);
    } catch (err) {
        console.error('API request failed:', err);
    }
}

run();
