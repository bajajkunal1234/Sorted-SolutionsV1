/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        instrumentationHook: true,
    },
    async redirects() {
        return [
            // AC Repair
            { source: '/ac-repair', destination: '/services/ac-repair', permanent: true },
            { source: '/service-page/split-a-c-installation', destination: '/services/ac-repair/split-ac', permanent: true },
            { source: '/service-page/foam-jet-ac-servicing', destination: '/services/ac-repair', permanent: true },
            { source: '/service-page/ac-water-leakage-repair', destination: '/services/ac-repair', permanent: true },
            { source: '/service-page/ac-less-no-cooling-solution', destination: '/services/ac-repair', permanent: true },
            { source: '/service-page/ac-power-issue-repair', destination: '/services/ac-repair', permanent: true },
            { source: '/service-page/ac-noise-smell-issue-repair', destination: '/services/ac-repair', permanent: true },
            
            // Washing Machine
            { source: '/wm-repair', destination: '/services/washing-machine-repair', permanent: true },
            { source: '/service-page/fully-automatic-check-up-top-load-1', destination: '/services/washing-machine-repair/top-load', permanent: true },
            { source: '/service-page/semi-automatic-check-up', destination: '/services/washing-machine-repair/semi-automatic', permanent: true },
            
            // Oven Repair
            { source: '/oven-repair', destination: '/services/oven-repair', permanent: true },
            { source: '/service-page/microwave-check-up-not-heating', destination: '/services/oven-repair/microwave-oven', permanent: true },
            
            // Water Purifier Repair
            { source: '/ro-repair', destination: '/services/water-purifier-repair', permanent: true },
            { source: '/service-page/water-purifier-regular-service', destination: '/services/water-purifier-repair/domestic-ro-water-purifier', permanent: true },
            
            // Hob Repair
            { source: '/gas-stove-hoobtop-repair', destination: '/services/hob-repair', permanent: true },
            { source: '/service-page/hob-top-check-up', destination: '/services/hob-repair', permanent: true },
            { source: '/service-page/gas-stove-check-up', destination: '/services/hob-repair', permanent: true },
            
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
