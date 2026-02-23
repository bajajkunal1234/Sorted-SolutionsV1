import { createServerSupabase } from '@/lib/supabase-server'

/**
 * Server component — fetches Google API settings from DB and injects all tags.
 * Rendered in app/layout.js. Outputs nothing if no settings configured.
 */
export default async function GoogleTagsProvider() {
    let cfg = {}
    try {
        const supabase = createServerSupabase()
        if (supabase) {
            const { data } = await supabase
                .from('website_config')
                .select('value')
                .eq('key', 'google_apis')
                .single()
            cfg = data?.value || {}
        }
    } catch { /* table may not exist yet */ }

    const {
        gtmId, ga4Id,
        adsConversionId, adsConversionLabel,
        searchConsoleVerification,
        schemaName, schemaPhone, schemaEmail,
        schemaAddress, schemaCity, schemaState, schemaPincode,
        schemaAreaServed, schemaPriceRange, schemaUrl, gmbProfileUrl
    } = cfg

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
                            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${adsConversionId}');${adsConversionLabel ? `gtag('event','conversion',{'send_to':'${adsConversionId}/${adsConversionLabel}'});` : ''}`
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
