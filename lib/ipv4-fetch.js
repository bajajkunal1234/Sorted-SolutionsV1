/**
 * DNS-bypassing fetch for Node.js (supabase-js compatible).
 *
 * Problem: Reliance (and some other Indian ISPs) intercept DNS for supabase.co
 * and return their own IP addresses that block HTTPS connections.
 * Meanwhile, Chrome/browsers are unaffected because they use DNS-over-HTTPS.
 *
 * Fix: Resolve the hostname via Google Public DNS (8.8.8.8) to get the real
 * Cloudflare IP. Then connect directly to that IP using Node's https module
 * with a custom Agent that sets the TLS servername (SNI) to the original
 * hostname so the TLS handshake succeeds.
 *
 * This is only applied server-side (API routes / Server Components) and
 * has no effect on the Vercel production deployment where DNS works correctly.
 */
// Custom fetch to bypass ISP DNS interception.
// Static imports removed to prevent client-side build errors.

let https;
let dns;
let resolver;

function initNodeModules() {
    if (!https) {
        https = require('https');
        dns = require('dns');
        resolver = new dns.Resolver();
        resolver.setServers(['8.8.8.8', '8.8.4.4']); // Google Public DNS
    }
}

// Cache resolved IPs to avoid repeated lookups (10 min TTL)
const dnsCache = new Map();
const DNS_TTL = 10 * 60 * 1000; // 10 minutes

async function resolveWithGoogleDNS(hostname) {
    initNodeModules();
    const cached = dnsCache.get(hostname);
    if (cached && Date.now() - cached.ts < DNS_TTL) return cached.ip;

    return new Promise((resolve) => {
        resolver.resolve4(hostname, (err, addrs) => {
            if (!err && addrs && addrs.length > 0) {
                dnsCache.set(hostname, { ip: addrs[0], ts: Date.now() });
                resolve(addrs[0]);
            } else {
                resolve(null); // Let default DNS handle it
            }
        });
    });
}

/**
 * Creates a fetch-compatible function that bypasses ISP DNS interception.
 * 
 * For each request:
 * 1. Resolves the hostname via Google DNS to get the correct IP.
 * 2. Makes an HTTPS request directly to that IP with the original hostname
 *    set as the TLS SNI servername and Host header.
 * 3. Converts the Node.js https response into a standard Response object.
 *
 * Falls back to regular fetch if anything goes wrong.
 */
export function createIPv4Fetch() {
    // Early exit if on client
    if (typeof window !== 'undefined') return (url, init) => fetch(url, init);

    return async function ipv4Fetch(inputUrl, init = {}) {
        initNodeModules();
        let url;
        try {
            const rawUrl = typeof inputUrl === 'string' ? inputUrl
                : inputUrl instanceof URL ? inputUrl.href
                    : inputUrl.url;
            url = new URL(rawUrl);
        } catch {
            return fetch(inputUrl, init);
        }

        const hostname = url.hostname;

        // Skip if already an IP, non-HTTPS, or not a remote host
        if (!hostname || url.protocol !== 'https:' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return fetch(inputUrl, init);
        }

        // Only apply to Supabase URLs to minimize performance impact
        if (!hostname.includes('supabase.co') && !hostname.includes('supabase.in')) {
            return fetch(inputUrl, init);
        }

        const ip = await resolveWithGoogleDNS(hostname);
        if (!ip) return fetch(inputUrl, init); // DNS failed — use default

        // Build request options
        const method = init.method || 'GET';
        const body = init.body;

        // Merge headers
        const rawHeaders = {};
        if (init.headers) {
            const h = new Headers(init.headers);
            h.forEach((v, k) => { rawHeaders[k] = v; });
        }
        rawHeaders['host'] = hostname; // Override host to the real hostname for proper routing
        rawHeaders['accept-encoding'] = 'identity'; // Prevent gzip/deflate — we pass raw Buffer to Response

        const requestOptions = {
            hostname: ip,
            port: 443,
            path: url.pathname + url.search,
            method,
            headers: rawHeaders,
            servername: hostname, // TLS SNI — critical for Cloudflare/Supabase routing
            rejectUnauthorized: false, // Required: Supabase TLS cert verification fails on some ISPs
            // Safe here because we resolve via Google DNS to the known Cloudflare IP
            timeout: 30000, // 30s timeout to avoid hanging requests
        };

        return new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const responseBody = Buffer.concat(chunks);
                    // Filter headers: only pass string values (undici rejects arrays/undefined)
                    const safeHeaders = {};
                    for (const [k, v] of Object.entries(res.headers)) {
                        if (typeof v === 'string') safeHeaders[k] = v;
                        else if (Array.isArray(v)) safeHeaders[k] = v.join(', ');
                    }
                    resolve(new Response(responseBody, {
                        status: res.statusCode,
                        statusText: res.statusMessage || '',
                        headers: safeHeaders,
                    }));
                });
                res.on('error', reject);
            });

            req.on('error', (err) => {
                // Reject with the real error — do NOT fall back to fetch() since
                // fetch() uses the same broken network path on affected ISPs.
                console.warn('[ipv4-fetch] https.request failed:', err.code, err.message);
                reject(err);
            });

            req.on('timeout', () => {
                console.warn('[ipv4-fetch] Request timed out, aborting.');
                req.destroy(new Error('Request timeout'));
            });

            if (body) {
                if (typeof body === 'string' || Buffer.isBuffer(body)) {
                    req.write(body);
                }
            }
            req.end();
        });
    };
}
