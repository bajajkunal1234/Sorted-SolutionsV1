require('dotenv').config({ path: '.env.local' });

async function run() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';
    
    const deviceId = '51167000000094403';
    const offDutyProfileId = '51167000000101018'; // Off-Duty profile to disassociate

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

    console.log(`2. Testing disassociation of profile "${offDutyProfileId}" using DELETE...`);
    const url = `${apiHost}/api/v1/mdm/devices/${deviceId}/profiles`;
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile_ids: [offDutyProfileId],
            }),
        });

        console.log('DELETE response status:', response.status);
        const text = await response.text();
        console.log('DELETE response content:', text);
    } catch (err) {
        console.error('DELETE request failed:', err);
    }

    console.log(`3. Testing disassociation using POST to /disassociate...`);
    const disassociateUrl = `${apiHost}/api/v1/mdm/devices/${deviceId}/profiles/disassociate`;
    try {
        const response = await fetch(disassociateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile_ids: [offDutyProfileId],
            }),
        });

        console.log('POST /disassociate status:', response.status);
        const text = await response.text();
        console.log('POST /disassociate response content:', text);
    } catch (err) {
        console.error('POST /disassociate failed:', err);
    }
}

run();
