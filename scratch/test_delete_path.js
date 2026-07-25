require('dotenv').config({ path: '.env.local' });

async function run() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';
    
    const deviceId = '51167000000094403';
    const offDutyProfileId = '51167000000101018'; // Off-Duty profile
    const onDutyProfileId = '51167000000097017'; // On-Duty Kiosk profile

    console.log('1. Fetching Zoho access token...');
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

    // Test: DELETE /api/v1/mdm/devices/{device_id}/profiles/{profile_id}
    // We will attempt to disassociate the Off-Duty Profile
    const url = `${apiHost}/api/v1/mdm/devices/${deviceId}/profiles/${offDutyProfileId}`;
    console.log(`\n2. Sending DELETE to "${url}"...`);
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        console.log('Response Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);
    } catch (err) {
        console.error('Request failed:', err);
    }
}

run();
