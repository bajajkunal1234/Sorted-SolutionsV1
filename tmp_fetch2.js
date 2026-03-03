const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
envRaw.split('\n').filter(l => l && !l.startsWith('#')).forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim().replace(/\r/g, '').replace(/^"|"$/g, '');
});

const urlObj = new URL(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/page_settings?page_id=like.*oven*&select=page_id,hero_settings,page_type');
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    family: 4, // force IPv4
    headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json'
    }
};

const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(JSON.stringify(JSON.parse(data), null, 2)));
});
req.on('error', e => console.error(e));
req.end();
