require('dotenv').config({ path: '.env.local' });

async function run() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';
    
    const deviceId = '4e6134444b055048';
    const profileId = '51167000000097017';

    console.log('1. Fetching live access token from Zoho OAuth...');
    let token = null;
    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
            }),
        });
        const data = await response.json();
        token = data.access_token;
        console.log('Access token received:', token ? 'YES (truncated)' : 'NO');
    } catch (err) {
        console.error('OAuth token failed:', err);
        return;
    }

    if (!token) return;

    console.log('2. Trying profile association call...');
    const url = `${apiHost}/api/v1/mdm/devices/${deviceId}/profiles`;
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
