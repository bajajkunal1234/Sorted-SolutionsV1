/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['pdf-parse'],
    },
    async redirects() {
        return [
            // 6 Main Category Pages (Urban Company UI)
            { source: '/ac-repair', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/refrigerator-repair', destination: '/v2/services/refrigerator-repair', permanent: true },
            { source: '/fridge-repair', destination: '/v2/services/refrigerator-repair', permanent: true },
            { source: '/washing-machine-repair', destination: '/v2/services/washing-machine-repair', permanent: true },
            { source: '/wm-repair', destination: '/v2/services/washing-machine-repair', permanent: true },
            { source: '/oven-repair', destination: '/v2/services/oven-repair', permanent: true },
            { source: '/microwave-repair', destination: '/v2/services/oven-repair', permanent: true },
            { source: '/water-purifier-repair', destination: '/v2/services/water-purifier-repair', permanent: true },
            { source: '/ro-repair', destination: '/v2/services/water-purifier-repair', permanent: true },
            { source: '/hob-repair', destination: '/v2/services/hob-repair', permanent: true },
            { source: '/gas-stove-hoobtop-repair', destination: '/v2/services/hob-repair', permanent: true },

            // Wix Legacy Service Pages
            { source: '/service-page/split-a-c-installation', destination: '/v2/services/ac-repair/split-ac', permanent: true },
            { source: '/service-page/foam-jet-ac-servicing', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/service-page/ac-water-leakage-repair', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/service-page/ac-less-no-cooling-solution', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/service-page/ac-power-issue-repair', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/service-page/ac-noise-smell-issue-repair', destination: '/v2/services/ac-repair', permanent: true },
            { source: '/service-page/fully-automatic-check-up-top-load-1', destination: '/v2/services/washing-machine-repair/top-load', permanent: true },
            { source: '/service-page/semi-automatic-check-up', destination: '/v2/services/washing-machine-repair/semi-automatic', permanent: true },
            { source: '/service-page/microwave-check-up-not-heating', destination: '/v2/services/oven-repair/microwave-oven', permanent: true },
            { source: '/service-page/water-purifier-regular-service', destination: '/v2/services/water-purifier-repair/ro-purifier', permanent: true },
            { source: '/service-page/hob-top-check-up', destination: '/v2/services/hob-repair/built-in-hob', permanent: true },
            { source: '/service-page/gas-stove-check-up', destination: '/v2/services/hob-repair/built-in-hob', permanent: true },
            
            // Discontinued / Orphaned (Routed to Homepage explicitly)
            { source: '/service-page/induction-cooktop-repair-solutions', destination: '/', permanent: true },
            { source: '/service-page/kettle-repair-solutions', destination: '/', permanent: true },
            { source: '/service-page/mixer-grinder-juicer-body-change', destination: '/', permanent: true },
            { source: '/service-page/decorative-fan-un-installation', destination: '/', permanent: true },
            { source: '/service-page/exhaust-pedestal-tower-fan-installation', destination: '/', permanent: true },
            { source: '/service-page/geyser-service-upto-10ltr', destination: '/', permanent: true },
            { source: '/service-page/water-cooler-foul-taste-solutions', destination: '/', permanent: true },
            { source: '/water-cooler-repair', destination: '/', permanent: true },
            { source: '/smallappliances-repair', destination: '/', permanent: true },

            // Catch-all: Any leftover /service-page/* from Wix that we missed -> Root
            { source: '/service-page/:slug*', destination: '/', permanent: true },

            // /services has no index page — redirect bare visits to homepage
            { source: '/services', destination: '/', permanent: true },
        ];
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
                    // Allow Vercel CDN + browsers to cache for 5 minutes (matches unstable_cache TTL).
                    // stale-while-revalidate lets CDN serve stale while fetching fresh in background.
                    { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' },
                ],
            },
            {
                source: '/location/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' },
                ],
            },
        ];
    },
}

module.exports = nextConfig
