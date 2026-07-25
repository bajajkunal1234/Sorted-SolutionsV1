require('dotenv').config({ path: '.env.local' });

async function run() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';
    const deviceId = '51167000000094403';

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

    // Test 1: POST /api/v1/mdm/devices/{device_id}/scan
    const url1 = `${apiHost}/api/v1/mdm/devices/${deviceId}/scan`;
    console.log('\n--- Test 1: POST', url1);
    try {
        const res = await fetch(url1, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        console.log('Status Code:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Test 1 failed:', err);
    }

    // Test 2: POST /api/v1/mdm/devices/{device_id}/actions/ScanDevice
    const url2 = `${apiHost}/api/v1/mdm/devices/${deviceId}/actions/ScanDevice`;
    console.log('\n--- Test 2: POST', url2);
    try {
        const res = await fetch(url2, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        console.log('Status Code:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Test 2 failed:', err);
    }
}

run();
