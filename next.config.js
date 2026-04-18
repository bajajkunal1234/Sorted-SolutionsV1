/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        instrumentationHook: true,
    },
    // ── Prevent Vercel Edge CDN from caching dynamic service/location pages ──
    // Even with force-dynamic + noStore(), Vercel's Edge Network can CDN-cache
    // responses unless explicit Cache-Control headers are returned. This was
    // causing Google Ads sitelink crawls to see stale/empty page content.
    async headers() {
        return [
            {
                source: '/services/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
                    { key: 'CDN-Cache-Control', value: 'no-store' },
                    { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
                ],
            },
            {
                source: '/location/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
                    { key: 'CDN-Cache-Control', value: 'no-store' },
                    { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
                ],
            },
        ];
    },
}

module.exports = nextConfig
