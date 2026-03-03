const fs = require('fs');
const https = require('https');
const envRaw = fs.readFileSync('.env.local', 'utf8');
const env = {};
envRaw.split('\n').filter(l => l && !l.startsWith('#')).forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim().replace(/\r/g, '').replace(/^"|"$/g, '');
});

const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const urlStr = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/booking_categories?slug=eq.oven-repair';
const urlObj = new URL(urlStr);

function doReq(method, path, bodyStr) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: urlObj.hostname, port: 443, path: path, method, family: 4,
            headers: {
                'apikey': key, 'Authorization': 'Bearer ' + key, 'Accept': 'application/json',
                ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function run() {
    const res = await doReq('GET', urlObj.pathname + urlObj.search);
    console.log("Found:", res.data);
    const rows = JSON.parse(res.data);
    if (rows && rows.length > 0 && rows[0].name === 'Microwave Oven') {
        console.log("Updating to Oven...");
        const patchRes = await doReq('PATCH', urlObj.pathname + urlObj.search, JSON.stringify({ name: 'Oven' }));
        console.log("Update status:", patchRes.status, patchRes.data);
    }
}
run();
