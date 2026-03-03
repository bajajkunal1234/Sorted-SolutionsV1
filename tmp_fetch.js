const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
envRaw.split('\n').filter(l => l && !l.startsWith('#')).forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
        env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim().replace(/\r/g, '').replace(/^"|"$/g, '');
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/page_settings?page_id=like.*oven*&select=page_id,hero_settings,page_type';
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(url, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } })
    .then(r => r.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(e => console.error(e));
