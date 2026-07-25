async function run() {
    console.log('Exchanging temporary grant token for Zoho OAuth access/refresh tokens...');
    try {
        const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code: '1000.a8ba87de3d9313fa2b13183d91c22452.8de2f7bbce43056f2611526fe531f630',
                client_id: '1000.88KJTMCYXR08FRF32BLURD7EX7JVLS',
                client_secret: '7529fdd889d461de84af71cbae1f8bac3041a93a2f',
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();
        console.log('Zoho Response Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error during token exchange:', err);
    }
}

run();
