require('dotenv').config({ path: '.env.local' });

async function run() {
    const clientId = process.env.MANAGEENGINE_CLIENT_ID;
    const clientSecret = process.env.MANAGEENGINE_CLIENT_SECRET;
    const refreshToken = process.env.MANAGEENGINE_REFRESH_TOKEN;
    const authUrl = process.env.MANAGEENGINE_AUTH_URL || 'https://accounts.zoho.in/oauth/v2/token';
    const apiHost = 'https://mdm.manageengine.in';

    console.log('Fetching OAuth token...');
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

    // We will probe several possible endpoints to inspect their status codes
    const endpoints = [
        '/api/v1/mdm/customers',
        '/api/v1/mdm/devices',
        '/api/v1/mdm/profiles',
        '/api/v1/mdm/summary',
    ];

    for (const ep of endpoints) {
        console.log(`Probing GET ${apiHost}${ep}...`);
        try {
            const res = await fetch(`${apiHost}${ep}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            console.log(`GET ${ep} - Status:`, res.status);
            const text = await res.text();
            console.log(`Response:`, text.substring(0, 300));
        } catch (err) {
            console.error(`Error probing ${ep}:`, err.message);
        }
    }
}

run();
