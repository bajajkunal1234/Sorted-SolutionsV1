/**
 * seed_all_pages.js
 * Uses the same DNS bypass as lib/ipv4-fetch.js:
 *   - Node's dns.Resolver pointed at 8.8.8.8 to get real Cloudflare IPs
 *   - Node's https module (not undici/fetch) to make the actual request
 */
const https = require('https');
const dns = require('dns');

// ── DNS resolver pointing at Google Public DNS ───────────────────────────────
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

const SUPABASE_HOSTNAME = 'oqwvbwaqcdbggcqvzswv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';

let resolvedIP = null;

async function getIP() {
    if (resolvedIP) return resolvedIP;
    return new Promise((resolve) => {
        resolver.resolve4(SUPABASE_HOSTNAME, (err, addrs) => {
            if (!err && addrs && addrs.length > 0) {
                resolvedIP = addrs[0];
                console.log(`✅ Resolved ${SUPABASE_HOSTNAME} → ${resolvedIP} via Google DNS`);
                resolve(resolvedIP);
            } else {
                console.error('❌ DNS resolution failed:', err?.message);
                resolve(null);
            }
        });
    });
}

function supabaseRequest(method, table, queryString, body) {
    return new Promise(async (resolve, reject) => {
        const ip = await getIP();
        if (!ip) return reject(new Error('DNS resolution failed'));

        const path = `/rest/v1/${table}${queryString ? '?' + queryString : ''}`;
        const bodyStr = body ? JSON.stringify(body) : null;

        const options = {
            hostname: ip,
            port: 443,
            path,
            method,
            servername: SUPABASE_HOSTNAME,    // TLS SNI
            rejectUnauthorized: false,          // Required for Cloudflare/Supabase on some ISPs
            timeout: 30000,
            headers: {
                'Host': SUPABASE_HOSTNAME,
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            }
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString();
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
                } else {
                    resolve(text ? JSON.parse(text) : []);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Request timeout')); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ── Data ─────────────────────────────────────────────────────────────────────
const LOCATIONS = [
    'andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
    'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim',
    'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'
];
const APPLIANCES = [
    { slug: 'ac-repair', name: 'Air Conditioner', subs: [{ slug: 'split-ac', name: 'Split AC' }, { slug: 'window-ac', name: 'Window AC' }] },
    { slug: 'washing-machine-repair', name: 'Washing Machine', subs: [{ slug: 'front-load', name: 'Front Load' }, { slug: 'top-load', name: 'Top Load' }] },
    { slug: 'refrigerator-repair', name: 'Refrigerator', subs: [{ slug: 'single-door', name: 'Single Door' }, { slug: 'double-door', name: 'Double Door' }] },
    { slug: 'oven-repair', name: 'Microwave Oven', subs: [{ slug: 'microwave-oven', name: 'Microwave Oven' }, { slug: 'otg-oven', name: 'OTG Oven' }] },
    { slug: 'water-purifier-repair', name: 'Water Purifier', subs: [{ slug: 'ro-purifier', name: 'RO Purifier' }, { slug: 'uv-purifier', name: 'UV Purifier' }] },
    { slug: 'hob-repair', name: 'Gas Stove / HOB', subs: [{ slug: 'gas-stove', name: 'Gas Stove' }, { slug: 'built-in-hob', name: 'Built-in HOB' }] },
];
const PROBLEMS = [
    { q: 'Not working at all', a: 'Our technicians diagnose and fix all types of complete failures.' },
    { q: 'Making unusual noise', a: 'We identify the source of abnormal sounds and resolve mechanical issues.' },
    { q: 'Performance issues', a: 'We restore full performance through comprehensive service and parts replacement.' },
    { q: 'Electrical problems', a: 'Our certified technicians handle all electrical faults safely.' },
    { q: 'Needs regular maintenance', a: 'We provide preventive maintenance to extend appliance lifespan.' },
];
function cap(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }

function buildExpected() {
    const pages = [];
    // 15 location hub pages
    for (const loc of LOCATIONS) {
        const n = cap(loc);
        pages.push({
            page_id: `loc-${loc}`, page_type: 'location',
            hero_settings: { title: `Appliance Repair Solutions in ${n}`, subtitle: `Trusted repair services across ${n}, Mumbai` },
            problems_settings: { title: `Common Appliance Problems in ${n}`, subtitle: 'Expert diagnosis and repair for all appliances' },
            services_settings: { title: `Repair Services in ${n}`, subtitle: 'Full-range appliance repair at competitive prices' },
            localities_settings: { title: `Nearby Areas in ${n}`, subtitle: 'We cover all localities around you' },
            brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
        });
    }
    for (const app of APPLIANCES) {
        const n = app.name;
        // 6 category pages
        pages.push({
            page_id: `cat-${app.slug}`, page_type: 'category',
            hero_settings: { title: `${n} Repair Services`, subtitle: `Expert ${n.toLowerCase()} repair in Mumbai` },
            problems_settings: { title: `${n} Problems We Solve`, subtitle: `Common ${n.toLowerCase()} issues we fix` },
            services_settings: { title: `${n} Services`, subtitle: 'Transparent pricing, no hidden charges' },
            localities_settings: { title: 'We Are Right In Your Neighbourhood', subtitle: 'Find us in your area' },
            brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
        });
        // 12 subcategory pages
        for (const sub of app.subs) {
            pages.push({
                page_id: `sub-${app.slug}-${sub.slug}`, page_type: 'subcategory',
                hero_settings: { title: `${sub.name} Repair Services`, subtitle: `Expert ${sub.name.toLowerCase()} repair in Mumbai` },
                problems_settings: { title: `${sub.name} Problems We Fix`, subtitle: `Common issues with your ${sub.name.toLowerCase()}` },
                services_settings: { title: `${sub.name} Services & Pricing`, subtitle: 'Starts at competitive prices' },
                localities_settings: { title: 'Service Available Across Mumbai', subtitle: "We're in your neighbourhood" },
                brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
            });
        }
        // 90 sub-location pages
        for (const loc of LOCATIONS) {
            const ln = cap(loc);
            pages.push({
                page_id: `sloc-${loc}-${app.slug}`, page_type: 'sublocation',
                hero_settings: { title: `${n} Repair in ${ln}`, subtitle: `Expert ${n.toLowerCase()} repair in ${ln}, Mumbai` },
                problems_settings: { title: `${n} Problems We Solve in ${ln}`, subtitle: `Common ${n.toLowerCase()} issues in ${ln}` },
                services_settings: { title: `Popular ${n} Services in ${ln}`, subtitle: 'Most booked services in your area' },
                localities_settings: { title: `Nearby Areas in ${ln}`, subtitle: 'Find your specific locality' },
                brands_settings: { items: [] }, faqs_settings: { items: [] }, updated_at: new Date().toISOString()
            });
        }
    }
    return pages;
}

async function main() {
    console.log('\n📊 Fetching current DB state...');
    const existing = await supabaseRequest('GET', 'page_settings', 'select=page_id,page_type&limit=500');
    const existingIds = new Set(existing.map(p => p.page_id));
    const expected = buildExpected();
    const missing = expected.filter(p => !existingIds.has(p.page_id));

    const byType = {};
    for (const p of existing) byType[p.page_type] = (byType[p.page_type] || 0) + 1;
    const extra = [...existingIds].filter(id => !new Set(expected.map(p => p.page_id)).has(id));

    console.log(`\n📋 Expected: ${expected.length} | In DB: ${existing.length} | Missing: ${missing.length} | Extra: ${extra.length}`);
    console.log('   By type:', JSON.stringify(byType));
    if (extra.length) console.log('   Extra IDs:', extra.slice(0, 8).join(', '));

    if (missing.length === 0) {
        console.log('\n🎉 All pages already seeded!');
        // Still normalize types
        await normalizeTypes();
        return;
    }

    // Upsert ALL missing pages in one single call
    console.log(`\n🌱 Upserting ${missing.length} missing pages in one call...`);
    await supabaseRequest('POST', 'page_settings', null, missing);
    console.log(`   ✅ Done!`);

    // Insert problems (batches of 100)
    console.log(`\n🌱 Inserting default problems...`);
    const probs = [];
    for (const p of missing) {
        PROBLEMS.forEach((pr, i) => probs.push({
            page_id: p.page_id, problem_title: pr.q,
            problem_description: pr.a, display_order: i
        }));
    }
    for (let i = 0; i < probs.length; i += 100) {
        await supabaseRequest('POST', 'page_problems', null, probs.slice(i, i + 100));
        process.stdout.write(`   ✅ ${Math.min(i + 100, probs.length)}/${probs.length} problems\r`);
    }
    console.log();

    await normalizeTypes();
    console.log('\n🎉 Done! Refresh the Active Service Pages dashboard.');
}

async function normalizeTypes() {
    const norm = [['loc', 'location'], ['cat', 'category'], ['sub', 'subcategory'], ['sub-loc', 'sublocation']];
    for (const [from, to] of norm) {
        try {
            await supabaseRequest('PATCH', 'page_settings', `page_type=eq.${from}`, { page_type: to });
            console.log(`   ✅ Normalized '${from}' → '${to}'`);
        } catch (e) { /* no rows to update - fine */ }
    }
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
