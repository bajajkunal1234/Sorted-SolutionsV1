import { createServerSupabase } from '@/lib/supabase-server'
import { unstable_cache } from 'next/cache'

/**
 * Cache the Google API config for 1 hour.
 * This prevents the live Supabase call from making GTM miss the HTML stream
 * on the /booking page when the DB connection is busy from other queries.
 * The config rarely changes — 1 hour TTL is safe.
 */
const getGoogleConfig = unstable_cache(
    async () => {
        try {
            const supabase = createServerSupabase()
            if (!supabase) return {}
            const { data } = await supabase
                .from('website_config')
                .select('value')
                .eq('key', 'google_apis')
                .single()
            return data?.value || {}
        } catch {
            return {}
        }
    },
    ['google-apis-config'],
    { revalidate: 3600 } // Re-fetch at most once per hour
)

/**
 * Server component — fetches Google API settings from DB and injects all tags.
 * Rendered in app/layout.js. Outputs nothing if no settings configured.
 */
export default async function GoogleTagsProvider() {
    const cfg = await getGoogleConfig()

    const {
        gtmId, ga4Id,
        adsConversionId, adsConversionLabel,
        searchConsoleVerification,
        schemaName, schemaPhone, schemaEmail,
        schemaAddress, schemaCity, schemaState, schemaPincode,
        schemaAreaServed, schemaPriceRange, schemaUrl, gmbProfileUrl
    } = cfg

    // The phone number Google should look for on the page and replace with GFN
    // when a visitor arrives from a paid ad. Must match exactly what's in Google Ads.
    const GFN_PHONE = schemaPhone || '+918928895590'

    // ── LocalBusiness schema JSON-LD ──────────────────────────────────────────
    const schema = schemaName ? {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: schemaName,
        ...(schemaUrl && { url: schemaUrl }),
        ...(schemaPhone && { telephone: schemaPhone }),
        ...(schemaEmail && { email: schemaEmail }),
        ...(schemaAddress && {
            address: {
                '@type': 'PostalAddress',
                streetAddress: schemaAddress,
                addressLocality: schemaCity || '',
                addressRegion: schemaState || '',
                postalCode: schemaPincode || '',
                addressCountry: 'IN'
            }
        }),
        ...(schemaAreaServed && {
            areaServed: schemaAreaServed.split(',').map(s => s.trim()).filter(Boolean)
        }),
        ...(schemaPriceRange && { priceRange: schemaPriceRange }),
        ...(gmbProfileUrl && { sameAs: [gmbProfileUrl] })
    } : null

    return (
        <>
            {/* ── Google Search Console Verification ── */}
            {searchConsoleVerification && (
                <meta name="google-site-verification" content={searchConsoleVerification} />
            )}

            {/* ── Google Tag Manager (head snippet) ── */}
            {gtmId && (
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
                    }}
                />
            )}

            {/* ── Google Tag Manager (body noscript fallback) ── */}
            {gtmId && (
                <noscript>
                    <iframe
                        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                        height="0" width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
            )}


            {/* ── Google Analytics 4 (only if no GTM) ── */}
            {ga4Id && !gtmId && (
                <>
                    <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`
                        }}
                    />
                </>
            )}

            {/* ── Google Ads Global Site Tag (only if no GTM) ── */}
            {adsConversionId && !gtmId && (
                <>
                    <script async src={`https://www.googletagmanager.com/gtag/js?id=${adsConversionId}`} />
                    <script
                        dangerouslySetInnerHTML={{
                            __html: [
                                `window.dataLayer=window.dataLayer||[];`,
                                `function gtag(){dataLayer.push(arguments);}`,
                                `gtag('js',new Date());`,
                                // Primary config — enables auto-tagging & GFN number swap
                                `gtag('config','${adsConversionId}',{`,
                                `  'phone_conversion_number':'${GFN_PHONE}'`,
                                `});`,
                                // Also push GA4 config if present alongside Ads
                                ga4Id ? `gtag('config','${ga4Id}');` : '',
                            ].join('')
                        }}
                    />
                </>
            )}

            {/* ── LocalBusiness Schema Markup ── */}
            {schema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            )}
        </>
    )
}
