const fs = require('fs');
const https = require('https');

const envText = fs.readFileSync('.env.local', 'utf8');

let url = '';
let key = '';

envText.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        url = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim().replace(/['"]/g, '');
    }
});

console.log('Parsed URL:', url);

const sql = `
ALTER TABLE booking_issues ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL;
ALTER TABLE booking_issues ADD COLUMN IF NOT EXISTS price_label TEXT DEFAULT 'Starting from';
NOTIFY pgrst, 'reload schema';
`;

const postData = JSON.stringify({ query: sql });
const reqUrl = new URL(url + '/rest/v1/rpc/exec_sql');

const options = {
    hostname: reqUrl.hostname,
    path: reqUrl.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', data);
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(postData);
req.end();
